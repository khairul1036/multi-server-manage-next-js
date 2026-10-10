import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServerRequest from '@/models/ServerRequest';
import User from '@/models/User';
import Server from '@/models/Server';
import ActivityLog from '@/models/ActivityLog';
import { verifyToken } from '@/lib/auth';
import { AgentClient } from '@/lib/agent-client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get('token')?.value;
    const session = token ? verifyToken(token) : null;

    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Administrators can manage requests' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const { status, assignedServerId, allocatedRamMB, allocatedDiskMB, adminNotes } = body;

    const requestDoc = await ServerRequest.findById(id).populate('userId');
    if (!requestDoc) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    const user = await User.findById(requestDoc.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Associated user account not found' }, { status: 404 });
    }

    if (status === 'approved') {
      if (!assignedServerId) {
        return NextResponse.json({ success: false, error: 'Please choose a VPS server to assign' }, { status: 400 });
      }

      const server = await Server.findById(assignedServerId);
      if (!server) {
        return NextResponse.json({ success: false, error: 'Selected server does not exist' }, { status: 404 });
      }

      // Assign server to user if not already assigned
      if (!user.assignedServers?.some((s) => s.toString() === assignedServerId)) {
        user.assignedServers = [...(user.assignedServers || []), assignedServerId];
      }

      // Calculate next available unique port if user does not have one
      if (!user.hostingPort) {
        const usedPorts = await User.find({ hostingPort: { $ne: null } }).distinct('hostingPort');
        let nextPort = 8081;
        while (usedPorts.includes(nextPort) && nextPort <= 8150) {
          nextPort++;
        }
        user.hostingPort = nextPort;
      }

      // Generate SSH password if not set
      if (!user.sshPassword) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        user.sshPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      }

      const diskMB = Number(allocatedDiskMB) || requestDoc.requestedDiskMB || 1024;
      const ramMB = Number(allocatedRamMB) || requestDoc.requestedRamMB || 2048;

      // Update User RAM & ROM (Disk) Limits
      user.limits = {
        ramLimitMB: ramMB,
        diskLimitMB: diskMB,
        cpuLimitPercent: user.limits?.cpuLimitPercent || 50,
      };

      if (!user.linuxUsername) {
        user.linuxUsername = user.name.toLowerCase().replace(/[^a-z0-9_-]/g, '') || `user${user.hostingPort}`;
      }

      // Trigger user isolation provisioning (chmod 700 + auto port + quota) on remote agent
      let agentMsg = '';
      try {
        const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
        const agentRes = await client.createLinuxUser(user.linuxUsername, diskMB, user.sshPassword);
        if (agentRes.success && agentRes.port) {
          user.hostingPort = agentRes.port;
          agentMsg = ` (Agent provisioned on Port ${agentRes.port})`;
        } else {
          agentMsg = ` (Port ${user.hostingPort} assigned, agent status: ${agentRes.error || 'offline'})`;
        }
      } catch (err: unknown) {
        agentMsg = ` (Port ${user.hostingPort} assigned, agent connection skipped)`;
      }

      await user.save();

      requestDoc.status = 'approved';
      requestDoc.assignedServerId = assignedServerId;
      requestDoc.adminNotes = adminNotes || `Approved and provisioned on ${server.name} (Port ${user.hostingPort})${agentMsg}`;
      await requestDoc.save();

      await ActivityLog.create({
        action: 'SERVER_REQUEST_APPROVED',
        performedBy: session.email,
        target: `${user.name} -> ${server.name}`,
        status: 'success',
        details: `Allocated RAM: ${user.limits.ramLimitMB}MB, Disk: ${user.limits.diskLimitMB}MB, Port: ${user.hostingPort} on node ${server.name}`,
      });

      return NextResponse.json({
        success: true,
        message: `Request approved. Server ${server.name} assigned with Port ${user.hostingPort}, ${user.limits.ramLimitMB}MB RAM and ${user.limits.diskLimitMB}MB Disk.`,
        request: requestDoc,
      });
    } else if (status === 'rejected') {
      requestDoc.status = 'rejected';
      requestDoc.adminNotes = adminNotes || 'Request declined by administrator';
      await requestDoc.save();

      await ActivityLog.create({
        action: 'SERVER_REQUEST_REJECTED',
        performedBy: session.email,
        target: user.email,
        status: 'warning',
        details: `Declined request: ${adminNotes || 'No notes provided'}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Request has been rejected',
        request: requestDoc,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action status' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
