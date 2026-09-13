import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const files = [
  'packages/api-client/openapi/finora.json',
  'packages/api-client/src/generated.ts',
];
const before = await Promise.all(files.map((file) => readFile(file, 'utf8')));
execFileSync('pnpm', ['api:generate'], { stdio: 'inherit' });
const after = await Promise.all(files.map((file) => readFile(file, 'utf8')));
for (let i = 0; i < files.length; i++) {
  if (before[i] !== after[i])
    throw new Error(
      `Контракт рассинхронизирован: ${files[i]}; выполните pnpm api:generate`,
    );
}
console.log('OpenAPI и generated client воспроизводимы');
