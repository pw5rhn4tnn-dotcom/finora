import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  composeSessionPath,
  profilePassword,
  type ComposeSessions,
} from './compose-session';

test('Stage 4/5: независимые неизменяемые сессии для browser cases', async ({
  playwright,
  baseURL,
}, info) => {
  const run = randomUUID();
  const email = `profile-${run}@stage4.example`;
  const request = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL! },
  });
  try {
    const registered = await request.post('/api/v1/auth/register', {
      data: {
        email,
        password: profilePassword,
        displayName: 'Профиль responsive',
        baseCurrency: 'USD',
        timeZone: 'Europe/Moscow',
      },
    });
    expect(registered.status()).toBe(201);
    const profile = await request.storageState();
    const login = await request.post('/api/v1/auth/login', {
      data: {
        email: 'personal@finora.example',
        password: 'Finora-Personal-2026!',
      },
    });
    expect(login.status()).toBe(200);
    const sessions: ComposeSessions = {
      run,
      email,
      profile,
      personal: await request.storageState(),
    };
    await mkdir(info.project.outputDir, { recursive: true });
    await writeFile(composeSessionPath(info), JSON.stringify(sessions));
  } finally {
    await request.dispose();
  }
});
