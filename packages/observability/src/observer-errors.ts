/** Expected invalid trusted-observer construction; never retains the supplied input. */
export class ObserverInputError extends Error {
  readonly code = 'VALIDATION_FAILED';
  constructor() {
    super('METRIC_OBSERVER_INPUT_INVALID');
    this.name = 'ObserverInputError';
  }
}
