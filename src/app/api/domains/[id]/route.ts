import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Domain from '@/models/Domain';
import Server from '@/models/Server';
import ActivityLog from '@/models/ActivityLog';
import { AgentClient } from '@/lib/agent-client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const domain = await Domain.findById(id);

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain not found' }, { status: 404 });
    }

    // Try to remove from remote agent
    const server = await Server.findById(domain.serverId);
    if (server) {
      const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
      await client.removeNginxDomain(domain.domainName);
    }

    await Domain.findByIdAndDelete(id);

    await ActivityLog.create({
      action: 'DOMAIN_REMOVED',
      performedBy: 'System Admin',
      target: domain.domainName,
      status: 'info',
      details: `Removed domain ${domain.domainName}`,
    });

    return NextResponse.json({ success: true, message: 'Domain removed successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete domain';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
