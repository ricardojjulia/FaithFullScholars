import os from 'node:os';
import path from 'node:path';

export type Persona = 'admin' | 'scholar' | 'institution' | 'applicant';

/** Must match scripts/ci-setup-test-users.mjs. */
export const PERSONA_EMAILS: Record<Persona, string> = {
  admin: 'e2e-admin@test.faithfullscholars.dev',
  scholar: 'e2e-scholar@test.faithfullscholars.dev',
  institution: 'e2e-institution@test.faithfullscholars.dev',
  applicant: 'e2e-applicant@test.faithfullscholars.dev',
};

/** Session files live outside the repository so they can never be committed. */
export const storageStatePath = (persona: Persona) =>
  path.join(os.tmpdir(), 'faithfull-scholars-e2e-auth', `${persona}.json`);
