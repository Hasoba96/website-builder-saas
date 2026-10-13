import type { PublicConfig } from '@website-builder/schemas/configuration';

export const PUBLIC_ENV_KEYS = Object.freeze([] as const);
export function getPublicConfig(): PublicConfig {
  return Object.freeze({});
}
