import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Domain from '@/models/Domain';
import Server from '@/models/Server';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { createDomainSchema } from '@/lib/validations';
import { AgentClient } from '@/lib/agent-client';

export async function GET() {
  try {
    await connectDB();
    const domains = await Domain.find()
      .populate('serverId', 'name ip status')
      .populate('userId', 'name email linuxUsername')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, domains });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch domains';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const validated = createDomainSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { domainName, serverId, userId, targetPort } = validated.data;

    // Check if domain already exists
    const existingDomain = await Domain.findOne({ domainName: domainName.toLowerCase() });
    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: 'This domain name is already registered in the system' },
        { status: 400 }
      );
    }

    const server = await Server.findById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Target VPS server not found' }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const portToUse = targetPort || user.hostingPort || 8081;

    // Call remote Agent to create Nginx config & reload Nginx
    const client = new AgentClient(server.ip, server.agentPort, server.agentApiKey);
    const agentResult = await client.setupNginxDomain(
      domainName.toLowerCase(),
      portToUse,
      user.linuxUsername
    );

    const newDomain = await Domain.create({
      domainName: domainName.toLowerCase(),
      serverId,
      userId,
      targetPort: portToUse,
      status: agentResult.success ? 'active' : 'pending',
      nginxConfigPath: agentResult.configPath || `/etc/nginx/conf.d/${domainName.toLowerCase()}.conf`,
    });

    await ActivityLog.create({
      action: 'DOMAIN_MAPPED',
      performedBy: user.email,
      target: domainName,
      status: agentResult.success ? 'success' : 'warning',
      details: `Domain ${domainName} pointed to port ${targetPort} on server ${server.name} (${server.ip}). Remote Nginx reload: ${
        agentResult.success ? 'Success' : agentResult.error || 'Pending'
      }`,
    });

    return NextResponse.json(
      {
        success: true,
        domain: newDomain,
        agentStatus: agentResult.success ? 'configured' : 'failed',
        message: agentResult.success
          ? 'Domain added and Nginx reverse proxy configured successfully!'
          : `Domain saved, but remote agent reported: ${agentResult.error || 'Nginx reload failed'}. It will retry.`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Domain setup failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
