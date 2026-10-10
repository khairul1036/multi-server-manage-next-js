import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServerRequest from '@/models/ServerRequest';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { verifyToken } from '@/lib/auth';

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

    if (session.role === 'superadmin' || session.role === 'admin') {
      const requests = await ServerRequest.find()
        .populate('userId', 'name email linuxUsername limits')
        .populate('assignedServerId', 'name ip status')
        .sort({ createdAt: -1 });

      return NextResponse.json({ success: true, requests });
    }

    // Regular tenant user only sees their own requests
    const requests = await ServerRequest.find({ userId: session.userId })
      .populate('assignedServerId', 'name ip status')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, requests });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch requests';
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
    const body = await req.json();

    const { requestedRamMB, requestedDiskMB, purpose } = body;

    if (!purpose || purpose.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Please describe the intended purpose or workload' },
        { status: 400 }
      );
    }

    const newRequest = await ServerRequest.create({
      userId: session.userId,
      requestedRamMB: Number(requestedRamMB) || 2048,
      requestedDiskMB: Number(requestedDiskMB) || 20480,
      purpose: purpose.trim(),
      status: 'pending',
    });

    await ActivityLog.create({
      action: 'SERVER_ACCESS_REQUESTED',
      performedBy: session.email,
      target: `RAM: ${requestedRamMB || 2048}MB | Disk: ${requestedDiskMB || 20480}MB`,
      status: 'info',
      details: `User requested server resources for: ${purpose}`,
    });

    return NextResponse.json(
      {
        success: true,
        request: newRequest,
        message: 'Your request has been submitted to the Super Administrator for approval',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
