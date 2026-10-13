import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ArtifactScanError, prepareArtifacts } from './ci-artifacts.ts';

type Upload = (
  name: string,
  files: string[],
  directory: string,
) => Promise<{ id?: number }>;

// Exit codes are the only diagnostic channel; SDK output stays inside the action child.
export async function publishEvidence(
  gate: unknown,
  upload: Upload = async (name, files, directory) => {
    const { DefaultArtifactClient } = await import('@actions/artifact');
    return new DefaultArtifactClient().uploadArtifact(name, files, directory, {
      retentionDays: 7,
      compressionLevel: 6,
    });
  },
) {
  let evidence: ReturnType<typeof prepareArtifacts>;
  try {
    evidence = prepareArtifacts(gate);
  } catch (error) {
    return error instanceof ArtifactScanError ? 32 : 31;
  }
  try {
    const result = await upload(
      `evidence-${gate}`,
      evidence.files,
      evidence.directory,
    );
    if (!Number.isSafeInteger(result.id) || Number(result.id) <= 0) return 33;
    return 0;
  } catch {
    return 33;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = await publishEvidence(process.argv[2]);
