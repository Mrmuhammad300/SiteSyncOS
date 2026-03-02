import { z } from 'zod';

const USER_ROLES = [
  'Admin', 'ProjectManager', 'Superintendent', 'FieldStaff',
  'Architect', 'Engineer', 'Owner', 'Subcontractor', 'Lender', 'SuperAdmin',
] as const;

export const SignupSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .max(254, 'Email too long'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(1, 'First name is required')
    .max(100),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(1, 'Last name is required')
    .max(100),
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${USER_ROLES.join(', ')}` }),
  }),
});

export type SignupInput = z.infer<typeof SignupSchema>;
