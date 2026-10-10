import { z } from 'zod';

// Strict Linux username schema to prevent command/shell injection
// Must start with lowercase letter or underscore, 3-32 chars, only lowercase, digits, dash, underscore
export const linuxUsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username cannot exceed 32 characters')
  .regex(/^[a-z_][a-z0-9_-]*$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores');

// Domain schema preventing shell injection in nginx config generation
export const domainSchema = z
  .string()
  .min(3, 'Domain must be at least 3 characters')
  .max(253, 'Domain cannot exceed 253 characters')
  .regex(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    'Invalid domain name format'
  );

// Server input validation
export const createServerSchema = z.object({
  name: z.string().min(2, 'Server name must be at least 2 characters').max(50),
  ip: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Must be a valid IPv4 address'
    ),
  sshPort: z.coerce.number().int().min(1).max(65535).default(22),
  agentPort: z.coerce.number().int().min(1).max(65535).default(4000),
  agentApiKey: z.string().min(12, 'Agent API Key must be at least 12 characters'),
  tags: z.array(z.string()).optional(),
});

// Domain creation validation
export const createDomainSchema = z.object({
  domainName: domainSchema,
  serverId: z.string().min(1, 'Server ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  targetPort: z.coerce.number().int().min(1).max(65535).optional(),
});

// User creation validation
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['superadmin', 'admin', 'user']).default('user'),
  linuxUsername: linuxUsernameSchema,
  serverId: z.string().optional(),
});

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register validation
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  linuxUsername: linuxUsernameSchema.optional(),
});

