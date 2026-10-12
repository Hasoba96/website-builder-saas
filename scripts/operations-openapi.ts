import { mkdirSync, writeFileSync } from 'node:fs';
import { operationalOpenApi } from '@website-builder/schemas/operations';

mkdirSync('docs/api', { recursive: true });
writeFileSync(
  'docs/api/operations.openapi.json',
  JSON.stringify(operationalOpenApi(), null, 2) + '\n',
);
