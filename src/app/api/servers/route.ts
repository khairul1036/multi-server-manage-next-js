import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Server from '@/models/Server';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { createServerSchema } from '@/lib/validations';
import { AgentClient } from '@/lib/agent-client';
import { verifyToken } from '@/lib/auth';

function getSessionUser(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'user') {
      const userDoc = await User.findById(session.userId);
      const assignedIds = userDoc?.assignedServers || [];
      const servers = await Server.find({ _id: { $in: assignedIds } }).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, servers, isRestricted: true });
    }

    // Super Admin / Admin: view all servers
    const servers = await Server.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, servers, isRestricted: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch servers';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Administrators can add new servers' },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();

    const validated = createServerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, ip, sshPort, agentPort, agentApiKey, tags } = validated.data;

    // Check if IP already registered
    const existing = await Server.findOne({ ip });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A server with this IP is already registered' },
        { status: 400 }
      );
    }

    // Attempt ping to remote agent
    const client = new AgentClient(ip, agentPort, agentApiKey);
    const health = await client.checkHealth();

    const newServer = await Server.create({
      name,
      ip,
      sshPort,
      agentPort,
      agentApiKey,
      status: health.success ? 'online' : 'unreachable',
      os: health.data?.os || 'Linux VPS',
      specs: health.success
        ? {
            cpuUsage: health.data?.cpuUsage || 0,
            memoryUsage: health.data?.memory?.usedPercentage || 0,
            totalMemoryMB: health.data?.memory?.totalMB || 0,
            freeMemoryMB: health.data?.memory?.freeMB || 0,
            diskUsage: health.data?.disk?.usagePercentage || 0,
            uptimeSeconds: health.data?.uptime || 0,
          }
        : undefined,
      lastPing: health.success ? new Date() : undefined,
      tags: tags || [],
    });

    await ActivityLog.create({
      action: 'SERVER_REGISTERED',
      performedBy: session.email,
      target: name,
      status: 'success',
      details: `Registered server ${name} (${ip}:${agentPort}) - Agent status: ${
        health.success ? 'Connected' : 'Unreachable'
      }`,
    });

    return NextResponse.json(
      {
        success: true,
        server: newServer,
        agentConnected: health.success,
        message: health.success
          ? 'Server added and agent verified successfully!'
          : 'Server added, but agent was not reachable. Please verify agent is running.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
