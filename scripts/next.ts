import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, basename } from 'node:path';
import { StructuredLogger } from '@website-builder/observability';
import nextEnv from '@next/env';
import {
  readWebConfig,
  readListenerConfig,
  readWebHttpSecurityConfig,
  ConfigurationError,
} from '@website-builder/config/web-server';

const args = process.argv.slice(2);
const standalone = args[0] === 'standalone';
const persistent = ['dev', 'start', 'standalone'].includes(args[0] ?? '');
const service =
  basename(process.cwd()) === 'public-renderer'
    ? 'public-renderer'
    : 'dashboard-web';
let logger = new StructuredLogger(service, 'unconfigured');
// Match Next's execution-mode default; deployment identity never defaults.
process.env['NODE_ENV'] ??= args[0] === 'dev' ? 'development' : 'production';
nextEnv.loadEnvConfig(process.cwd(), args[0] === 'dev');
try {
  const config = readWebConfig();
  readWebHttpSecurityConfig();
  logger = new StructuredLogger(service, config.APP_ENV);
  if (
    (args[0] === 'dev' && config.NODE_ENV !== 'development') ||
    (['build', 'start', 'standalone'].includes(args[0] ?? '') &&
      config.NODE_ENV !== 'production')
  )
    throw new ConfigurationError(['NODE_ENV']);
  if (args.some((arg) => /^(-p|-H|--port|--hostname)(=|$)/.test(arg)))
    throw new ConfigurationError(['HOST', 'PORT']);
  if (persistent) {
    const listener = readListenerConfig();
    if (standalone) {
      // Official standalone server reads HOSTNAME; only validated HOST supplies it.
      process.env['HOSTNAME'] = listener.HOST;
      process.env['PORT'] = String(listener.PORT);
    } else
      args.push('--hostname', listener.HOST, '--port', String(listener.PORT));
  }
} catch (error: unknown) {
  logger.emit('startup_failed', {
    code: 'CONFIGURATION_INVALID',
    ...(error instanceof ConfigurationError
      ? {
          details: {
            fields: error.keys.map((path) => ({ path, code: 'INVALID' })),
          },
        }
      : {}),
  });
  process.exit(1);
}

const require = createRequire(resolve(process.cwd(), 'package.json'));
const child = spawn(
  process.execPath,
  standalone
    ? [resolve('.next/standalone/apps', service, 'server.js')]
    : [require.resolve('next/dist/bin/next'), ...args],
  {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    stdio: persistent ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  },
);
const deadline = persistent
  ? undefined
  : setTimeout(() => child.kill(), 10 * 60 * 1000);
let shutdownSignal: 'SIGINT' | 'SIGTERM' | undefined;
let shutdownDeadline: ReturnType<typeof setTimeout> | undefined;
if (persistent) {
  for (const [stream, event] of [
    [child.stdout, 'framework_output'],
    [child.stderr, 'framework_warning'],
  ] as const) {
    let pending = '';
    stream?.setEncoding('utf8');
    stream?.on('data', (chunk: string) => {
      pending += chunk;
      if (pending.length > 16384) {
        pending = '';
        logger.emit(event);
        return;
      }
      let end: number;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 1);
        if (!line.trim()) continue;
        try {
          logger.forward(JSON.parse(line) as unknown);
        } catch {
          logger.emit(event);
        }
      }
    });
  }
}
child.once('error', () => {
  logger.emit('startup_failed', { code: 'INTERNAL_ERROR' });
  process.exitCode = 1;
});
child.once('exit', (code) => {
  clearTimeout(deadline);
  clearTimeout(shutdownDeadline);
  // Next standalone drains its server, then uses conventional signal exit codes.
  const clean =
    code === 0 ||
    (standalone &&
      shutdownSignal !== undefined &&
      code === (shutdownSignal === 'SIGTERM' ? 143 : 130));
  if (persistent) logger.emit(clean ? 'stopped' : 'shutdown_failed');
  process.exitCode = clean ? 0 : (code ?? 1);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (shutdownSignal) return;
    shutdownSignal = signal;
    child.kill(signal);
    shutdownDeadline = setTimeout(() => child.kill('SIGKILL'), 10000);
  });
}
