import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { hashPassword, signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { seedSuperAdmin } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await seedSuperAdmin();

    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    let { linuxUsername } = validated.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Auto generate linux username if not provided
    if (!linuxUsername) {
      const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      linuxUsername = `${prefix}_${randomSuffix}`;
    }

    const existingLinuxUser = await User.findOne({ linuxUsername });
    if (existingLinuxUser) {
      return NextResponse.json(
        { success: false, error: 'This Linux username is already in use. Please pick another one.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'superadmin' : 'user';

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      linuxUsername,
      assignedServers: [],
    });

    const token = signToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          linuxUsername: newUser.linuxUsername,
        },
        token,
        message: 'Account created successfully',
      },
      { status: 201 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
