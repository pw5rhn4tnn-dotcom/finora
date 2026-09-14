import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const exec = promisify(execFile);
// Отдельные PostgreSQL, API process/limiter и Nginx для намеренного исчерпания
// auth bucket. Используются те же production images и конфигурация лимитов.
export async function securityCompose(checkout, project, env) {
  const override = join(checkout, 'security-images.json');
  await writeFile(
    override,
    JSON.stringify({
      services: {
        api: { image: `${project}-api` },
        web: { image: `${project}-web` },
      },
    }),
  );
  const securityEnv = { ...env, WEB_PORT: '0', POSTGRES_PORT: '0' };
  const compose = async (...args) =>
    (
      await exec(
        'docker',
        [
          'compose',
          '-p',
          `${project}-security`,
          '-f',
          'docker-compose.yml',
          '-f',
          override,
          ...args,
        ],
        {
          cwd: checkout,
          env: securityEnv,
          maxBuffer: 16 * 1024 * 1024,
          timeout: 300000,
        },
      )
    ).stdout;
  return {
    async start(browserHost) {
      await compose(
        'up',
        '-d',
        '--no-build',
        '--wait',
        '--wait-timeout',
        '180',
      );
      const address = new URL(
        `http://${(await compose('port', 'web', '80')).trim()}`,
      );
      if (browserHost) address.hostname = browserHost;
      const url = address.origin;
      securityEnv.AUTH_ORIGINS = url;
      await compose(
        'up',
        '-d',
        '--no-build',
        '--wait',
        '--wait-timeout',
        '180',
        'api',
      );
      return url;
    },
    logs: () => compose('logs', '--no-color'),
    close: () => compose('down', '-v', '--remove-orphans'),
  };
}
