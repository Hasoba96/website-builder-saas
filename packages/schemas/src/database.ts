import { z } from 'zod';
import { environmentSchema } from './configuration.js';

const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
const identifier = z.string().regex(/^[a-z][a-z0-9_]{0,62}$/);
export const databaseConfigSchema = environmentSchema
  .safeExtend({
    DB_HOST: z.union([z.ipv4(), z.ipv6(), z.hostname()]),
    DB_PORT: integer(1, 65535),
    DB_NAME: identifier,
    DB_USER: identifier,
    DB_PASSWORD: z
      .string()
      .min(1)
      .max(4096)
      .refine((value) => !value.includes('\0') && value !== 'REPLACE_ME'),
    DB_TLS: z.enum(['disable', 'verify-full']),
    DB_CA: z.string().min(1).optional(),
    DB_POOL_MAX: integer(1, 20),
    DB_CONNECT_TIMEOUT_MS: integer(100, 10000),
    DB_IDLE_TIMEOUT_MS: integer(100, 60000),
    DB_STATEMENT_TIMEOUT_MS: integer(100, 30000),
    DB_QUERY_TIMEOUT_MS: integer(100, 35000),
    DB_LOCK_TIMEOUT_MS: integer(100, 30000),
  })
  .superRefine((value, context) => {
    if (
      value.DB_TLS === 'disable' &&
      (!['local', 'ci'].includes(value.APP_ENV) ||
        !['localhost', '127.0.0.1', '::1'].includes(value.DB_HOST))
    )
      context.addIssue({
        code: 'custom',
        path: ['DB_TLS'],
        message: 'Verified TLS required',
      });
    if (value.DB_TLS === 'disable' && value.DB_CA !== undefined)
      context.addIssue({
        code: 'custom',
        path: ['DB_CA'],
        message: 'CA requires verified TLS',
      });
    if (value.DB_QUERY_TIMEOUT_MS <= value.DB_STATEMENT_TIMEOUT_MS)
      context.addIssue({
        code: 'custom',
        path: ['DB_QUERY_TIMEOUT_MS'],
        message: 'Must exceed statement timeout',
      });
    if (value.DB_LOCK_TIMEOUT_MS > value.DB_STATEMENT_TIMEOUT_MS)
      context.addIssue({
        code: 'custom',
        path: ['DB_LOCK_TIMEOUT_MS'],
        message: 'Must not exceed statement timeout',
      });
  });
export type DatabaseConfig = Readonly<z.output<typeof databaseConfigSchema>>;
