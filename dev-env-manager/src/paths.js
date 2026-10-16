import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const SERVICES = Object.freeze({ backend: 'backend/.env', frontend: 'frontend/.env', nlp: 'nlp-service/.env' });
export const STATE = path.join(process.platform === 'win32' ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')) : path.join(os.homedir(), '.local', 'share'),
  'FITM-INTERN', 'dev-env-manager', createHash('sha256').update(REPO).digest('hex').slice(0, 16));
export const PORT = 5379;
