import { afterEach, expect, it, vi } from 'vitest';
import {
  createServer,
  request,
  type ServerResponse,
  type RequestListener,
} from 'node:http';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import {
  BoundedMetrics,
  observeResponse,
} from '@website-builder/observability';

afterEach(() => vi.useRealTimers());
const row = (
  m: BoundedMetrics,
  name: string,
  outcome = 'success',
  service = 'api',
) =>
  m
    .snapshot()
    .series.find(
      (s) =>
        s.name === name &&
        s.service === service &&
        (!('outcome' in s) || (s.outcome === outcome && s.route === 'other')),
    );
const histogram = (m: BoundedMetrics, outcome = 'success') =>
  row(m, 'http_duration_ms', outcome);
async function serve(handler: RequestListener) {
  const server = createServer(handler);
  await new Promise<void>((accept) => server.listen(0, '127.0.0.1', accept));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw Error('TEST_LISTENER_INVALID');
  return {
    port: address.port,
    close: () =>
      new Promise<void>((accept, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : accept()));
      }),
  };
}
const hit = (port: number, method = 'GET') =>
  new Promise<number>((accept, reject) => {
    const client = request(
      {
        host: '127.0.0.1',
        port,
        agent: false,
        method,
        path: '/?l02-private',
        headers: {
          authorization: 'l02-private',
          cookie: 'l02-private',
          'content-length': Buffer.byteLength('l02-private'),
        },
      },
      (response) => {
        response.resume();
        response.on('end', () => accept(response.statusCode!));
      },
    );
    client.on('error', reject);
    client.end('l02-private');
  });
it('observes native finish then close once, only after completion, without private input', async () => {
  const metrics = new BoundedMetrics();
  let release = () => {},
    entered = () => {};
  const ready = new Promise<void>((accept) => {
    entered = accept;
  });
  const server = await serve((_request, response) => {
    observeResponse(metrics, 'api', 'other', response);
    release = () => response.end('ok');
    entered();
  });
  try {
    const pending = hit(server.port);
    await ready;
    expect(histogram(metrics)).toMatchObject({ count: 0 });
    release();
    expect(await pending).toBe(200);
    expect(histogram(metrics)).toMatchObject({ count: 1 });
    expect(JSON.stringify(metrics.snapshot())).not.toContain('l02-private');
  } finally {
    await server.close();
  }
});
it('records native before-header and streaming aborts as aborted, never default200 success', async () => {
  for (const streaming of [false, true]) {
    const metrics = new BoundedMetrics();
    let entered = () => {},
      closed = () => {};
    const ready = new Promise<void>((accept) => {
      entered = accept;
    });
    const ended = new Promise<void>((accept) => {
      closed = accept;
    });
    const server = await serve((_request, response) => {
      observeResponse(metrics, 'api', 'other', response);
      response.once('close', closed);
      if (streaming) response.write('partial');
      entered();
    });
    const client = request(
      { host: '127.0.0.1', port: server.port },
      (response) => response.once('data', () => client.destroy()),
    );
    client.on('error', () => {});
    client.end();
    try {
      await ready;
      if (!streaming) client.destroy();
      await ended;
      expect(histogram(metrics, 'aborted')).toMatchObject({ count: 1 });
      expect(histogram(metrics)).toMatchObject({ count: 0 });
    } finally {
      client.destroy();
      await server.close();
    }
  }
});
it('preserves final denial, OPTIONS, redirect and concurrent response status', async () => {
  const metrics = new BoundedMetrics();
  let index = 0;
  const codes = [403, 429, 204, 302, 500];
  const server = await serve((_request, response) => {
    observeResponse(metrics, 'api', 'other', response);
    response.statusCode = codes[index++] ?? 200;
    response.end();
  });
  try {
    for (const [n, code] of codes.entries())
      expect(await hit(server.port, n === 2 ? 'OPTIONS' : 'GET')).toBe(code);
    expect(
      await Promise.all(Array.from({ length: 8 }, () => hit(server.port))),
    ).toEqual(Array(8).fill(200));
    expect(histogram(metrics, 'client_error')).toMatchObject({ count: 2 });
    expect(histogram(metrics, 'redirect')).toMatchObject({ count: 1 });
    expect(histogram(metrics, 'server_error')).toMatchObject({ count: 1 });
    expect(histogram(metrics)).toMatchObject({ count: 9 });
  } finally {
    await server.close();
  }
});
it('contains observer failures in real HTTP responses and detaches on disposal or invalid time', async () => {
  const broken = {
    record() {
      throw Error('l02-private');
    },
  } as unknown as BoundedMetrics;
  const server = await serve((_request, response) => {
    observeResponse(broken, 'api', 'other', response);
    response.end('ok');
  });
  try {
    expect(await hit(server.port)).toBe(200);
  } finally {
    await server.close();
  }
  const metrics = new BoundedMetrics(() => 0);
  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
  }) as ServerResponse;
  let time = 10;
  const stop = observeResponse(metrics, 'api', 'other', response, () => time);
  time = 9;
  response.emit('finish');
  response.emit('close');
  stop();
  stop();
  expect(
    response.listenerCount('finish') + response.listenerCount('close'),
  ).toBe(0);
  expect(histogram(metrics)).toMatchObject({ count: 0 });
  observeResponse(metrics, 'api', 'other', response, () => NaN);
  observeResponse(
    metrics,
    'api',
    'other',
    response,
    () => Number.MAX_SAFE_INTEGER + 1,
  );
  observeResponse(metrics, 'api', 'l02-private' as 'other', response);
  const detach = observeResponse(metrics, 'api', 'other', response);
  detach();
  response.emit('finish');
  expect(
    response.listenerCount('finish') + response.listenerCount('close'),
  ).toBe(0);
  expect(histogram(metrics)).toMatchObject({ count: 0 });
});
it('keeps import inert and server-only without retaining a native child loop', () => {
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import {observeResponse} from '@website-builder/observability';if(typeof observeResponse!=='function')process.exit(2)",
    ],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 5000 },
  );
  expect(child.error).toBeUndefined();
  expect(child.status).toBe(0);
  expect(child.stderr).toBe('');
});
it('rejects unsafe context and terminal clocks and disposes before further events', () => {
  const metrics = new BoundedMetrics(() => 0);
  for (const late of [false, true]) {
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      destroyed: late,
    }) as ServerResponse;
    observeResponse(metrics, 'l02-private' as 'api', 'other', response);
    expect(response.listenerCount('finish')).toBe(0);
    let time = 0;
    const stop = observeResponse(metrics, 'api', 'other', response, () => time);
    time = Infinity;
    expect(() => response.emit('finish')).not.toThrow();
    stop();
    expect(
      response.listenerCount('finish') + response.listenerCount('close'),
    ).toBe(0);
  }
  const response = Object.assign(new EventEmitter(), {
    statusCode: 503,
  }) as ServerResponse;
  observeResponse(metrics, 'worker', 'ready', response, () => 0);
  response.emit('finish');
  response.emit('close');
  expect(
    metrics
      .snapshot()
      .series.find(
        (s) =>
          s.name === 'http_duration_ms' &&
          s.service === 'worker' &&
          s.route === 'ready' &&
          s.outcome === 'server_error',
      ),
  ).toMatchObject({ count: 1 });
  expect(histogram(metrics)).toMatchObject({ count: 0 });
});
