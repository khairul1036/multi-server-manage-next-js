import connectDB from './db';
import User from '@/models/User';
import { hashPassword } from './auth';

export async function seedSuperAdmin() {
  await connectDB();

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@saas.com').toLowerCase().trim();
  const superAdminPass = process.env.SUPER_ADMIN_PASS || 'Admin123456!';
  const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Administrator';

  const existingSuperAdmin = await User.findOne({
    $or: [{ email: superAdminEmail }, { role: 'superadmin' }],
  });

  if (!existingSuperAdmin) {
    const hashedPassword = await hashPassword(superAdminPass);
    const superAdmin = await User.create({
      name: superAdminName,
      email: superAdminEmail,
      password: hashedPassword,
      role: 'superadmin',
      linuxUsername: 'root_admin',
    });

    console.log(`[SEED] Super Admin created successfully: ${superAdmin.email}`);
    return { created: true, email: superAdmin.email };
  }

  return { created: false, email: existingSuperAdmin.email };
}
