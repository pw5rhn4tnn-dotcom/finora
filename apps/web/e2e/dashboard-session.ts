import { createHash } from 'node:crypto';
import { test as base } from './budget-session';
import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
type Kind = 'categories' | 'transactions' | 'budgets';
export const test = base.extend<{
  year: number;
  unique: string;
  data: {
    create: (
      kind: Kind,
      values: object,
      api?: APIRequestContext,
    ) => Promise<string>;
  };
}>({
  year: async ({ baseURL }, use, info) => {
    if (!baseURL) throw new Error('Нужен Compose');
    await use(3000 + info.parallelIndex * 100 + info.repeatEachIndex);
  },
  unique: async ({ year }, use, info) => {
    await use(
      createHash('sha256')
        .update(
          `${year}:${info.project.outputDir}:${info.testId}:${info.repeatEachIndex}`,
        )
        .digest('hex')
        .slice(0, 12),
    );
  },
  data: [
    async ({ page, baseURL, playwright }, use) => {
      const api = await playwright.request.newContext({
        baseURL,
        storageState: await page.context().storageState(),
        extraHTTPHeaders: { Origin: baseURL! },
      });
      const records: { kind: Kind; id: string; api: APIRequestContext }[] = [];
      const pending: Promise<void>[] = [];
      const track = async (
        kind: Kind,
        response: { status: () => number; json: () => Promise<unknown> },
        context = api,
      ) => {
        expect(response.status()).toBe(201);
        const result = (await response.json()) as { id: string };
        records.push({ kind, id: result.id, api: context });
        return result.id;
      };
      page.on('response', (r) => {
        if (
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname === '/api/v1/transactions' &&
          r.status() === 201
        )
          pending.push(track('transactions', r).then(() => {}));
      });
      try {
        await use({
          create: async (kind, values, context = api) =>
            track(
              kind,
              await context.post(`/api/v1/${kind}`, {
                data: values,
                headers: { Origin: baseURL! },
              }),
              context,
            ),
        });
      } finally {
        await Promise.all(pending);
        try {
          for (const kind of ['transactions', 'budgets', 'categories'] as const)
            for (const record of records.filter((r) => r.kind === kind)) {
              const r = await record.api.delete(
                `/api/v1/${kind}/${record.id}`,
                { headers: { Origin: baseURL! } },
              );
              expect(r.status(), `cleanup ${kind}`).toBe(
                kind === 'categories' ? 200 : 204,
              );
              expect(
                (await record.api.get(`/api/v1/${kind}/${record.id}`)).status(),
              ).toBe(404);
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
