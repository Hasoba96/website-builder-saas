import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { logSchema, probeSchema } from '@website-builder/schemas/operations';

it.each(['api', 'worker'])(
  '%s built process boots and closes cleanly',
  async (app) => {
    const child = spawn(
      process.execPath,
      [resolve('apps', app, 'dist/main.js')],
      {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          APP_ENV: 'ci',
          HOST: '127.0.0.1',
          PORT: '3303',
          ...(app === 'api' ? { REDIS_PORT: '1' } : {}),
        },
      },
    );
    let output = '';
    let errors = '';
    if (!child.stdout || !child.stderr)
      throw new Error('Missing process output pipes');
    const stdout = child.stdout;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      errors += chunk;
    });
    const exit = once(child, 'exit');
    const deadline = setTimeout(() => child.kill(), 25_000);
    try {
      await new Promise<void>((accept, reject) => {
        child.once('error', reject);
        child.once('exit', () => reject(new Error('Exited before startup')));
        stdout.on('data', (chunk: string) => {
          output += chunk;
          if (output.includes('"event":"started"')) accept();
        });
      });
      if (app === 'api') {
        const response = await fetch('http://127.0.0.1:3303/ready', {
          signal: AbortSignal.timeout(5000),
        });
        expect(response.status).toBe(200);
        probeSchema.parse(await response.json());
      }
      child.send('shutdown');
      const [code, signal] = await exit;
      expect(code).toBe(0);
      expect(signal).toBeNull();
      expect(output).toContain('"event":"stopped"');
      expect(errors).toBe('');
      for (const line of output.trim().split('\n'))
        logSchema.parse(JSON.parse(line));
    } finally {
      clearTimeout(deadline);
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }
  },
);
