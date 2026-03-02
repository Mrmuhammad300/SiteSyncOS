import { z } from 'zod';

const ACCOUNTING_PROVIDERS = ['QuickBooks', 'Xero', 'FreshBooks', 'Sage', 'NetSuite', 'Custom'] as const;

export const CreateAccountingIntegrationSchema = z.object({
  provider: z.enum(ACCOUNTING_PROVIDERS, {
    errorMap: () => ({ message: `Provider must be one of: ${ACCOUNTING_PROVIDERS.join(', ')}` }),
  }),
  name: z.string().min(1, 'Name is required').max(200),
  companyId: z.string().max(200).optional(),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  accessToken: z.string().max(2000).optional(),
  refreshToken: z.string().max(2000).optional(),
  webhookUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  config: z.record(z.unknown()).optional().nullable(),
  autoSyncEnabled: z.boolean().optional().default(false),
  syncFrequency: z.string().max(50).optional().nullable(),
});

export const UpdateAccountingIntegrationSchema = CreateAccountingIntegrationSchema
  .omit({ provider: true })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  );

export type CreateAccountingIntegrationInput = z.infer<typeof CreateAccountingIntegrationSchema>;
export type UpdateAccountingIntegrationInput = z.infer<typeof UpdateAccountingIntegrationSchema>;
