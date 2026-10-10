import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Server from '@/models/Server';
import Domain from '@/models/Domain';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';

export async function GET() {
  try {
    await connectDB();

    const [totalServers, onlineServers, totalDomains, totalUsers, recentLogs] =
      await Promise.all([
        Server.countDocuments(),
        Server.countDocuments({ status: 'online' }),
        Domain.countDocuments(),
        User.countDocuments(),
        ActivityLog.find().sort({ createdAt: -1 }).limit(10),
      ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalServers,
        onlineServers,
        offlineServers: totalServers - onlineServers,
        totalDomains,
        totalUsers,
      },
      recentLogs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch statistics';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
