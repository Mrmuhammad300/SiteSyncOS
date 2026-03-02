import { z } from 'zod';

const PROJECT_STATUSES = ['PreConstruction', 'Active', 'OnHold', 'Completed'] as const;
const PROJECT_PHASES = ['Planning', 'Foundation', 'Framing', 'MEP', 'Finishing', 'Closeout'] as const;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  client: z.string().min(1, 'Client name is required').max(200),
  projectNumber: z
    .string()
    .min(1, 'Project number is required')
    .max(50)
    .regex(/^[A-Za-z0-9\-_]+$/, 'Project number may only contain letters, numbers, hyphens, and underscores'),
  address: z.string().min(1, 'Address is required').max(300),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  startDate: z.string().datetime({ message: 'startDate must be an ISO 8601 date-time string' }),
  estimatedCompletion: z.string().datetime({ message: 'estimatedCompletion must be an ISO 8601 date-time string' }),
  budget: z.number({ invalid_type_error: 'Budget must be a number' }).positive('Budget must be positive'),
  status: z.enum(PROJECT_STATUSES).optional().default('PreConstruction'),
  phase: z.enum(PROJECT_PHASES).optional().default('Planning'),
  description: z.string().max(5000).optional(),
  projectManagerId: z.string().cuid('Invalid projectManagerId').optional().nullable(),
  superintendentId: z.string().cuid('Invalid superintendentId').optional().nullable(),
  architectId: z.string().cuid('Invalid architectId').optional().nullable(),
  engineerId: z.string().cuid('Invalid engineerId').optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
