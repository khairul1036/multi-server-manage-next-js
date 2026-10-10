import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Server from '@/models/Server';
import Domain from '@/models/Domain';
import ActivityLog from '@/models/ActivityLog';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const server = await Server.findById(id);

    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const domainsCount = await Domain.countDocuments({ serverId: id });

    return NextResponse.json({
      success: true,
      server: {
        ...server.toObject(),
        domainsCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { verifyToken } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get('token')?.value;
    const session = token ? verifyToken(token) : null;
    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Only administrators can delete servers' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const server = await Server.findByIdAndDelete(id);

    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    // Cascade delete associated domain records
    await Domain.deleteMany({ serverId: id });

    await ActivityLog.create({
      action: 'SERVER_DELETED',
      performedBy: 'System Admin',
      target: server.name,
      status: 'warning',
      details: `Removed server ${server.name} (${server.ip}) and its domain references.`,
    });

    return NextResponse.json({ success: true, message: 'Server deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
