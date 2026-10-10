import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Server from '@/models/Server';
import { verifyToken } from '@/lib/auth';
import { AgentClient } from '@/lib/agent-client';

function getSession(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const currentUser = await User.findById(session.userId).populate('assignedServers');
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Tenant user is STRICTLY locked to their own linuxUsername
    let targetUsername = currentUser.linuxUsername;
    const url = new URL(req.url);
    const subPath = url.searchParams.get('subPath') || '';

    // If super admin, they can optionally view a specific tenant
    if (session.role === 'superadmin' || session.role === 'admin') {
      const queryUser = url.searchParams.get('username');
      if (queryUser) targetUsername = queryUser;
    }

    if (!targetUsername) {
      return NextResponse.json(
        { success: false, error: 'No isolated Linux username assigned to your account' },
        { status: 400 }
      );
    }

    // Find user's assigned server
    const serverId = url.searchParams.get('serverId') || currentUser.assignedServers?.[0];
    let server = null;
    if (serverId) {
      server = await Server.findById(serverId);
    } else {
      server = await Server.findOne({ status: 'online' });
    }

    if (!server) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active VPS server assigned to host your files. Please request server access first.',
        },
        { status: 404 }
      );
    }

    const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
    const result = await client.listUserFiles(targetUsername, subPath);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to retrieve directory files' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      homePath: result.homePath,
      serverName: server.name,
      files: result.files,
      username: targetUsername,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Files operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const currentUser = await User.findById(session.userId);
    if (!currentUser || !currentUser.linuxUsername) {
      return NextResponse.json({ success: false, error: 'User account not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { fileName, isDirectory, content } = body;

    const serverId = currentUser.assignedServers?.[0];
    if (!serverId) {
      return NextResponse.json({ success: false, error: 'No assigned server to create files' }, { status: 400 });
    }

    const server = await Server.findById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
    const result = await client.createUserFile(currentUser.linuxUsername, fileName, isDirectory, content);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File creation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
