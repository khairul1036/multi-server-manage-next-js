import { NextResponse } from 'next/server';
import { seedSuperAdmin } from '@/lib/seed';

export async function POST() {
  try {
    const result = await seedSuperAdmin();
    return NextResponse.json({
      success: true,
      message: result.created ? 'Super Admin created successfully' : 'Super Admin already exists',
      email: result.email,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seeding failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
