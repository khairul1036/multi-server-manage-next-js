import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Server from '@/models/Server';
import Domain from '@/models/Domain';
import ActivityLog from '@/models/ActivityLog';
import { verifyToken } from '@/lib/auth';
import { AgentClient } from '@/lib/agent-client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get('token')?.value;
    const session = token ? verifyToken(token) : null;

    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can delete users' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;
    const user = await User.findById(id).populate('assignedServers');

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'superadmin') {
      return NextResponse.json({ success: false, error: 'Cannot delete Super Admin account' }, { status: 400 });
    }

    // Delete on remote agent if assigned
    if (user.assignedServers && user.assignedServers.length > 0 && user.linuxUsername) {
      for (const s of user.assignedServers as any[]) {
        if (s && s.ip) {
          const client = new AgentClient(s.ip, s.agentPort, s.agentApiKey);
          await client.deleteLinuxUser(user.linuxUsername);
        }
      }
    }

    // Delete domains owned by user
    await Domain.deleteMany({ userId: id });

    // Delete user document
    await User.findByIdAndDelete(id);

    await ActivityLog.create({
      action: 'USER_DELETED',
      performedBy: session.email,
      target: user.email,
      status: 'warning',
      details: `Deleted user ${user.name} (${user.linuxUsername}) and freed port ${user.hostingPort}`,
    });

    return NextResponse.json({ success: true, message: `User ${user.name} deleted successfully` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
