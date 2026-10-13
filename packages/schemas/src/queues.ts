import { z } from 'zod';
import { environmentSchema } from './configuration.js';

const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
export const redisConfigSchema = environmentSchema
  .safeExtend({
    REDIS_HOST: z.union([z.ipv4(), z.ipv6(), z.hostname()]),
    REDIS_PORT: integer(1, 65535),
    REDIS_USERNAME: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    REDIS_PASSWORD: z
      .string()
      .min(1)
      .max(4096)
      .refine((value) => !value.includes('\0') && value !== 'REPLACE_ME'),
    REDIS_TLS: z.enum(['disable', 'verify-full']),
    REDIS_CA: z.string().min(1).optional(),
    REDIS_CONNECT_TIMEOUT_MS: integer(100, 10000),
    REDIS_COMMAND_TIMEOUT_MS: integer(100, 10000),
    REDIS_OUTAGE_TIMEOUT_MS: integer(500, 30000),
    REDIS_RECONNECT_LIMIT: integer(0, 10),
    REDIS_RECONNECT_DELAY_MS: integer(50, 2000),
    SHUTDOWN_TIMEOUT_MS: integer(100, 30000),
  })
  .superRefine((value, context) => {
    if (
      value.REDIS_TLS === 'disable' &&
      (!['local', 'ci'].includes(value.APP_ENV) ||
        !['localhost', '127.0.0.1', '::1'].includes(value.REDIS_HOST))
    )
      context.addIssue({
        code: 'custom',
        path: ['REDIS_TLS'],
        message: 'Verified TLS required',
      });
    if (value.REDIS_TLS === 'disable' && value.REDIS_CA !== undefined)
      context.addIssue({
        code: 'custom',
        path: ['REDIS_CA'],
        message: 'CA requires verified TLS',
      });
  });
export const queueConfigSchema = redisConfigSchema.safeExtend({
  QUEUE_NAMESPACE: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
  QUEUE_ATTEMPTS: integer(1, 5),
  QUEUE_BACKOFF_MS: integer(100, 10000),
  QUEUE_RETENTION_COUNT: integer(1, 1000),
  QUEUE_RETENTION_AGE_SECONDS: integer(1, 86400),
  QUEUE_CONCURRENCY: integer(1, 10),
  QUEUE_JOB_TIMEOUT_MS: integer(100, 30000),
});
export type RedisConfig = Readonly<z.output<typeof redisConfigSchema>>;
export type QueueConfig = Readonly<z.output<typeof queueConfigSchema>>;
