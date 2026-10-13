import { z } from 'zod';
import {
  apiConfigSchema,
  operationsConfigSchema,
  workerProbeConfigSchema,
  httpSecuritySchema,
  webHttpSecuritySchema,
} from './configuration.js';
import { databaseConfigSchema } from './database.js';
import { queueConfigSchema } from './queues.js';
const configurationKeys = new Set([
  'NEXT_PUBLIC_* (not allowlisted)',
  ...Object.keys(apiConfigSchema.shape),
  ...Object.keys(operationsConfigSchema.shape),
  ...Object.keys(workerProbeConfigSchema.shape),
  ...Object.keys(httpSecuritySchema.shape),
  ...Object.keys(webHttpSecuritySchema.shape),
  ...Object.keys(databaseConfigSchema.shape),
  ...Object.keys(queueConfigSchema.shape),
]);
export const logDetailsSchema = z.strictObject({
  fields: z
    .array(
      z.strictObject({
        path: z.string().refine((key) => configurationKeys.has(key)),
        code: z.literal('INVALID'),
      }),
    )
    .max(32),
});

export const requestIdSchema = z
  .string()
  .regex(
    /^req_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
export const errorCodeSchema = z.enum([
  'MALFORMED_REQUEST',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'NOT_READY',
  'INTERNAL_ERROR',
  'CONFIGURATION_INVALID',
  'DEPENDENCY_UNAVAILABLE',
  'FORBIDDEN',
  'RATE_LIMITED',
]);
export const probeSchema = z.strictObject({
  data: z.strictObject({}),
  requestId: requestIdSchema,
});
export const probeInputSchema = z.strictObject({
  method: z.literal('GET'),
  hasQuery: z.literal(false),
  hasTransferEncoding: z.literal(false),
  contentLength: z.string().regex(/^0+$/),
});
export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string(),
    details: z.strictObject({}),
    requestId: requestIdSchema,
  }),
});
export const eventSchema = z.enum([
  'started',
  'ready',
  'stopping',
  'stopped',
  'startup_failed',
  'shutdown_failed',
  'dependency_unavailable',
  'infrastructure_failure',
  'unexpected_error',
  'http_completed',
  'health_completed',
  'ready_completed',
  'invalid_log_input',
  'logging_resumed',
  'http_dispatched',
  'framework_output',
  'framework_warning',
]);
export const logSchema = z.strictObject({
  timestamp: z.iso.datetime(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  service: z.enum(['api', 'worker', 'dashboard-web', 'public-renderer']),
  environment: z.enum([
    'local',
    'ci',
    'preview',
    'staging',
    'production',
    'unconfigured',
  ]),
  requestId: requestIdSchema,
  organizationId: z.null(),
  siteId: z.null(),
  userId: z.null(),
  message: eventSchema,
  event: eventSchema,
  durationMs: z.number().finite().nonnegative(),
  code: errorCodeSchema.optional(),
  details: logDetailsSchema.optional(),
});
export type LogRecord = z.output<typeof logSchema>;
export type OperationalEvent = z.output<typeof eventSchema>;
export type ErrorCode = z.output<typeof errorCodeSchema>;

export function operationalOpenApi() {
  const response = (description: string, schema: z.ZodType) => ({
    description,
    headers: { 'X-Request-Id': { schema: z.toJSONSchema(requestIdSchema) } },
    content: { 'application/json': { schema: z.toJSONSchema(schema) } },
  });
  return {
    openapi: '3.1.0',
    info: { title: 'Operational probes', version: '1.0.0' },
    paths: {
      '/health': {
        get: {
          description:
            'Process liveness; no dependency checks. No query or body accepted.',
          responses: {
            '200': response('Alive', probeSchema),
            '400': response('Malformed request', errorSchema),
            '403': response('Origin not allowed', errorSchema),
            '429': response(
              'Rate limit exceeded; Retry-After in seconds',
              errorSchema,
            ),
            '500': response('Unexpected failure', errorSchema),
          },
        },
      },
      '/ready': {
        get: {
          description:
            'Role readiness. No dependency details, query or body accepted.',
          responses: {
            '200': response('Ready', probeSchema),
            '400': response('Malformed request', errorSchema),
            '403': response('Origin not allowed', errorSchema),
            '429': response(
              'Rate limit exceeded; Retry-After in seconds',
              errorSchema,
            ),
            '503': response('Not ready', errorSchema),
            '500': response('Unexpected failure', errorSchema),
          },
        },
      },
    },
  };
}
