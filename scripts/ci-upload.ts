import { DefaultArtifactClient } from '@actions/artifact';
import { prepareArtifacts } from './ci-artifacts.ts';

// Run only by the local action with captured output: upstream diagnostics are not public logs.
const gate = process.argv[2];
const { files, directory } = prepareArtifacts(gate);
await new DefaultArtifactClient().uploadArtifact(
  `evidence-${gate}`,
  files,
  directory,
  {
    retentionDays: 7,
    compressionLevel: 6,
  },
);
