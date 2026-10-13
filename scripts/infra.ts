import {
  initializeLocal,
  localUp,
  localReset,
  localDirectory,
  localProject,
  compose,
  runLocal,
} from './local-infrastructure.ts';

try {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'init':
      initializeLocal(localDirectory, args[0], args[1]);
      break;
    case 'up':
      await localUp(localDirectory, localProject);
      break;
    case 'status':
      process.stdout.write(
        compose(localDirectory, localProject, ['ps']) + '\n',
      );
      break;
    case 'stop':
      compose(localDirectory, localProject, ['stop', '--timeout', '15']);
      break;
    case 'down':
      compose(localDirectory, localProject, ['down', '--timeout', '15']);
      break;
    case 'reset':
      localReset(localDirectory, localProject, args[0]);
      break;
    case 'migrate':
      await runLocal(localDirectory, 'migration', args);
      break;
    case 'run':
      await runLocal(localDirectory, args[0] ?? '', args.slice(1));
      break;
    default:
      throw new Error(
        'Use infra init [DB_PORT REDIS_PORT] | up | status | stop | down | reset --delete-local-data | migrate status/check/up/down | run api/worker',
      );
  }
  process.stdout.write(
    `Local infrastructure command completed: ${localProject}\n`,
  );
} catch (error) {
  process.stderr.write(
    (error instanceof Error
      ? error.message
      : 'Local infrastructure command failed') + '\n',
  );
  process.exitCode = 1;
}
