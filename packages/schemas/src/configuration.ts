import { z } from 'zod';

const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
const list = z
  .string()
  .max(2048)
  .transform((value) => (value === '' ? [] : value.split(',')));
const origin = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['https:', 'http:'].includes(url.protocol) &&
        url.origin === value &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  });
export const httpSecuritySchema = z.strictObject({
  HTTP_ALLOWED_HOSTS: list.pipe(
    z
      .array(
        z
          .string()
          .max(253)
          .refine((value) =>
            value.startsWith('[') && value.endsWith(']')
              ? z.ipv6().safeParse(value.slice(1, -1)).success
              : /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
                  value,
                ),
          ),
      )
      .min(1)
      .max(16),
  ),
  HTTP_CORS_ORIGINS: list.pipe(z.array(origin).max(16)),
  HTTP_BODY_MAX_BYTES: integer(0, 65536),
  HTTP_RATE_LIMIT: integer(10, 10000),
  HTTP_RATE_WINDOW_MS: integer(1000, 60000),
});
export type HttpSecurityConfig = Readonly<z.output<typeof httpSecuritySchema>>;
export const webHttpSecuritySchema = z.strictObject({
  HTTP_CANONICAL_ORIGIN: origin,
});
const environment = {
  NODE_ENV: z.enum(['development', 'test', 'production']),
  APP_ENV: z.enum(['local', 'ci', 'preview', 'staging', 'production']),
};
const listener = {
  HOST: z.union([z.ipv4(), z.ipv6(), z.literal('localhost')]),
  PORT: integer(1, 65535),
};
const shutdown = { SHUTDOWN_TIMEOUT_MS: integer(100, 30000) };

export const environmentSchema = z
  .strictObject(environment)
  .refine(
    (value) =>
      !['preview', 'staging', 'production'].includes(value.APP_ENV) ||
      value.NODE_ENV === 'production',
    { path: ['NODE_ENV'], message: 'Deployment requires production mode' },
  );
export const listenerSchema = z.strictObject(listener);
export const workerProbeConfigSchema = z.strictObject({
  PROBE_HOST: listener.HOST,
  PROBE_PORT: listener.PORT,
});
export const operationsConfigSchema = z.strictObject({
  READINESS_TIMEOUT_MS: integer(100, 5000),
});
export const apiConfigSchema = environmentSchema.safeExtend({
  ...listener,
  ...shutdown,
});
export const workerConfigSchema = environmentSchema.safeExtend({
  ...shutdown,
});
export type ApiConfig = Readonly<z.output<typeof apiConfigSchema>>;
export type WorkerConfig = Readonly<z.output<typeof workerConfigSchema>>;
export type WebConfig = Readonly<z.output<typeof environmentSchema>>;
export type PublicConfig = Readonly<Record<string, never>>;
