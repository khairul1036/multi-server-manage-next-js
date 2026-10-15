import { NextRequest, NextResponse } from 'next/server';
import { AgentClient } from '@/lib/agent-client';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    const session = token ? verifyToken(token) : null;
    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { ip, agentPort = 4000, agentApiKey } = await req.json();
    if (!ip || !agentApiKey) {
      return NextResponse.json({ success: false, error: 'IP and API Key are required' }, { status: 400 });
    }

    const client = new AgentClient(ip, Number(agentPort), agentApiKey, 4000);
    const health = await client.checkHealth();

    if (health.success && health.data) {
      return NextResponse.json({
        success: true,
        data: health.data,
        message: 'Agent is online and responding!',
      });
    }

    return NextResponse.json({
      success: false,
      error: health.error || 'Agent unreachable on specified IP and port. Make sure agent.js is running.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ping test failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
