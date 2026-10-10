import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Server from '@/models/Server';
import ActivityLog from '@/models/ActivityLog';
import { createUserSchema } from '@/lib/validations';
import { hashPassword, verifyToken } from '@/lib/auth';
import { AgentClient } from '@/lib/agent-client';

export async function GET() {
  try {
    await connectDB();
    const users = await User.find()
      .select('-password')
      .populate('assignedServers', 'name ip status')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const validated = createUserSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role, linuxUsername, serverId } = validated.data;

    // Check email uniqueness
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check linux username uniqueness
    const existingLinuxUser = await User.findOne({ linuxUsername });
    if (existingLinuxUser) {
      return NextResponse.json(
        { success: false, error: 'This Linux username is already allocated' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const quotaVal = Number(body.quota_val) || 1;
    const quotaUnit = body.quota_unit || 'GB';
    const quotaMB = quotaUnit === 'GB' ? quotaVal * 1024 : quotaVal;

    // Target server: specified server or first available server
    let targetServer = null;
    if (serverId) {
      targetServer = await Server.findById(serverId);
    } else {
      targetServer = await Server.findOne({ status: 'online' }) || await Server.findOne();
    }

    let agentProvisioningMessage = 'User created in database.';

    // Find next available free port from database (range 8081 - 8150)
    const usedPorts = await User.find({ hostingPort: { $ne: null } }).distinct('hostingPort');
    let calculatedPort = 8081;
    while (usedPorts.includes(calculatedPort) && calculatedPort <= 8150) {
      calculatedPort++;
    }
    let assignedPort = calculatedPort;

    if (targetServer) {
      const client = new AgentClient(targetServer.ip, targetServer.agentPort, targetServer.agentApiKey);
      const agentRes = await client.createLinuxUser(linuxUsername, quotaMB, password);
      if (agentRes.success && agentRes.port) {
        assignedPort = agentRes.port;
        agentProvisioningMessage = `Linux user '${linuxUsername}' created with auto hosting port ${assignedPort} on ${targetServer.name}.`;
      } else {
        agentProvisioningMessage = `User saved with Port ${assignedPort}, but worker agent reported: ${agentRes.error || 'node offline'}`;
      }
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      linuxUsername,
      hostingPort: assignedPort,
      sshPassword: password,
      usedStorageMB: 0.05,
      limits: {
        ramLimitMB: 2048,
        diskLimitMB: quotaMB,
        cpuLimitPercent: 50,
      },
      assignedServers: targetServer ? [targetServer._id] : [],
    });
    await newUser.save();

    await ActivityLog.create({
      action: 'USER_CREATED',
      performedBy: 'System Admin',
      target: email,
      status: 'success',
      details: `Created user ${name} (${linuxUsername}). ${agentProvisioningMessage}`,
    });

    const userObj = newUser.toObject();
    const { password: _removedPassword, ...sanitizedUser } = userObj;

    return NextResponse.json(
      {
        success: true,
        user: sanitizedUser,
        message: agentProvisioningMessage,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'User creation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    const session = token ? verifyToken(token) : null;
    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can update limits' },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { userId, ramLimitMB, diskLimitMB, assignedServers } = body;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (ramLimitMB || diskLimitMB) {
      user.limits = {
        ramLimitMB: Number(ramLimitMB) || user.limits?.ramLimitMB || 2048,
        diskLimitMB: Number(diskLimitMB) || user.limits?.diskLimitMB || 20480,
        cpuLimitPercent: user.limits?.cpuLimitPercent || 50,
      };
    }

    if (Array.isArray(assignedServers)) {
      user.assignedServers = assignedServers;
    }

    await user.save();

    await ActivityLog.create({
      action: 'USER_LIMITS_UPDATED',
      performedBy: session.email,
      target: user.email,
      status: 'info',
      details: `Updated quotas: RAM ${user.limits?.ramLimitMB}MB, Disk ${user.limits?.diskLimitMB}MB`,
    });

    return NextResponse.json({
      success: true,
      message: 'User resource limits updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        limits: user.limits,
        assignedServers: user.assignedServers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
