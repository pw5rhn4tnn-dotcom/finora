import {
  test as base,
  expect,
  type APIRequestContext,
  type TestInfo,
} from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { createHash } from 'node:crypto';

type State = Awaited<ReturnType<APIRequestContext['storageState']>>;
export type ComposeSessions = {
  run: string;
  email: string;
  personal: State;
  profile: State;
};
export function composeSessionPath(info: TestInfo) {
  const project = info.config.projects.find((p) => p.name === 'compose-auth');
  if (!project) throw new Error('Не настроен setup project compose-auth');
  return join(project.outputDir, 'sessions.json');
}
export const profilePassword = 'Stage4-strong-password!';
export const test = base.extend<{
  sessions: ComposeSessions;
  unique: string;
  finance: {
    create: (
      kind: 'categories' | 'transactions',
      data: object,
    ) => Promise<string>;
  };
}>({
  sessions: async ({ baseURL }, use, info) => {
    if (!baseURL) throw new Error('Нужен Compose baseURL');
    const sessions = JSON.parse(
      await readFile(composeSessionPath(info), 'utf8'),
    ) as ComposeSessions;
    await use(sessions);
  },
  unique: async ({ sessions }, use, info) => {
    await use(
      createHash('sha256')
        .update(`${sessions.run}:${info.testId}:${info.repeatEachIndex}`)
        .digest('hex')
        .slice(0, 12),
    );
  },
  finance: [
    async ({ page, playwright, baseURL, sessions }, use) => {
      const api = await playwright.request.newContext({
        baseURL,
        storageState: sessions.personal,
        extraHTTPHeaders: { Origin: baseURL! },
      });
      const transactions = new Set<string>();
      const categories = new Set<string>();
      const pending: Promise<void>[] = [];
      page.on('response', (response) => {
        const path = new URL(response.url()).pathname.split('/');
        const kind = path.at(-1);
        if (response.request().method() === 'DELETE') {
          if (path.at(-2) === 'transactions' && response.status() === 204)
            transactions.delete(kind!);
          if (path.at(-2) === 'categories' && response.status() === 200)
            pending.push(
              response.json().then((result: { outcome: string }) => {
                if (result.outcome === 'deleted') categories.delete(kind!);
              }),
            );
        }
        if (
          response.request().method() === 'POST' &&
          response.status() === 201 &&
          (kind === 'transactions' || kind === 'categories')
        ) {
          pending.push(
            response.json().then((record: { id: string }) => {
              (kind === 'transactions' ? transactions : categories).add(
                record.id,
              );
            }),
          );
        }
      });
      try {
        await use({
          create: async (kind, data) => {
            const response = await api.post(`/api/v1/${kind}`, { data });
            expect(response.status()).toBe(201);
            const record = z
              .object({ id: z.string().uuid() })
              .parse(await response.json());
            (kind === 'transactions' ? transactions : categories).add(
              record.id,
            );
            return record.id;
          },
        });
      } finally {
        await Promise.all(pending);
        try {
          for (const [kind, records] of [
            ['transactions', transactions],
            ['categories', categories],
          ] as const) {
            for (const id of records) {
              const response = await api.delete(`/api/v1/${kind}/${id}`);
              expect(response.status()).toBe(
                kind === 'transactions' ? 204 : 200,
              );
              expect((await api.get(`/api/v1/${kind}/${id}`)).status()).toBe(
                404,
              );
            }
          }
        } finally {
          await api.dispose();
        }
      }
    },
    { auto: true },
  ],
});
export { expect };
