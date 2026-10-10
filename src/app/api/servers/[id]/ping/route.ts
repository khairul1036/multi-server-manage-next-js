import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Server from '@/models/Server';
import { AgentClient } from '@/lib/agent-client';

export async function POST(
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

    const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
    const health = await client.checkHealth();

    if (health.success && health.data) {
      server.status = 'online';
      server.lastPing = new Date();
      server.specs = {
        cpuUsage: health.data.cpuUsage,
        memoryUsage: health.data.memory?.usedPercentage || 0,
        totalMemoryMB: health.data.memory?.totalMB || 0,
        freeMemoryMB: health.data.memory?.freeMB || 0,
        diskUsage: health.data.disk?.usagePercentage || 0,
        uptimeSeconds: health.data.uptime || 0,
      };
      if (health.data.os) {
        server.os = health.data.os;
      }
    } else {
      server.status = 'offline';
    }

    await server.save();

    return NextResponse.json({
      success: true,
      status: server.status,
      specs: server.specs,
      lastPing: server.lastPing,
      message: health.success ? 'Server responded successfully' : health.error || 'Server unreachable',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ping failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
