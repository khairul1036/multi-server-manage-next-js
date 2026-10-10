import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Server from '@/models/Server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { AgentClient } from '@/lib/agent-client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get('token')?.value;
    const session = token ? verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const user = await User.findById(id).populate('assignedServers');

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Only superadmin or the user themselves can regenerate
    if (session.role === 'user' && session.userId !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // If user is assigned to server, trigger agent password regeneration
    let newPass = '';
    const server = user.assignedServers?.[0] as any;
    if (server && user.linuxUsername) {
      const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
      const res = await client.regeneratePassword(user.linuxUsername);
      if (res.success && res.password) {
        newPass = res.password;
      }
    }

    if (!newPass) {
      // Fallback generator
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
      for (let i = 0; i < 10; i++) {
        newPass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    user.sshPassword = newPass;
    user.password = await hashPassword(newPass);
    await user.save();

    return NextResponse.json({
      success: true,
      password: newPass,
      message: 'Password regenerated successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate password';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
