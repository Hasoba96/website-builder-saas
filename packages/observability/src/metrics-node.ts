import type { ServerResponse } from 'node:http';
import type { BoundedMetrics } from './metrics.js';
import type { StructuredLogger } from './index.js';

type Service = 'api' | 'worker';
type Route = 'health' | 'ready' | 'other';
export function observeResponse(
  metrics: BoundedMetrics,
  service: Service,
  route: Route,
  response: ServerResponse | undefined,
  owner: StructuredLogger,
  now = () => performance.now(),
) {
  let done = false,
    start = 0;
  let diagnostics: StructuredLogger | undefined = owner;
  function stop() {
    done = true;
    response?.removeListener('finish', finish);
    response?.removeListener('close', close);
    response = undefined;
    diagnostics = undefined;
  }
  function terminal(aborted: boolean) {
    if (done) return;
    const target = response;
    const diagnostic = diagnostics;
    stop();
    try {
      const end = now();
      if (!Number.isFinite(end) || end < start || end > Number.MAX_SAFE_INTEGER)
        return;
      const elapsed = end - start;
      const outcomes = [
        'success',
        'redirect',
        'client_error',
        'server_error',
      ] as const;
      metrics.record({
        name: 'http_duration_ms',
        service,
        route,
        outcome: aborted
          ? 'aborted'
          : outcomes[Math.floor((target?.statusCode ?? 0) / 100) - 2],
        value: elapsed,
      });
    } catch {
      diagnostic?.observerFailure();
    }
  }
  function finish() {
    terminal(false);
  }
  function close() {
    terminal(true);
  }
  try {
    if (
      !['api', 'worker'].includes(service) ||
      !['health', 'ready', 'other'].includes(route) ||
      !response ||
      response.destroyed ||
      response.writableFinished
    )
      stop();
    else {
      start = now();
      if (
        !Number.isFinite(start) ||
        start < 0 ||
        start > Number.MAX_SAFE_INTEGER
      )
        stop();
      else {
        response.once('finish', finish);
        response.once('close', close);
      }
    }
  } catch {
    diagnostics?.observerFailure();
    stop();
  }
  return stop;
}
