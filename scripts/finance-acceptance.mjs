import assert from 'node:assert/strict';
export async function financeAcceptance(url, compose, databaseHash) {
  const request = (path, method = 'GET', data, cookie) =>
    fetch(`${url}/api/v1${path}`, {
      method,
      headers: {
        Origin: url,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  async function login(email, password) {
    const r = await request('/auth/login', 'POST', { email, password });
    assert.equal(r.status, 200);
    return r.headers.get('set-cookie').split(';')[0];
  }
  const personal = await login(
      'personal@finora.example',
      'Finora-Personal-2026!',
    ),
    family = await login('family@finora.example', 'Finora-Family-2026!');
  const category = await request(
    '/categories',
    'POST',
    {
      name: 'Compose Stage 5',
      type: 'EXPENSE',
      icon: 'wallet',
      color: '#4F46E5',
    },
    personal,
  );
  assert.equal(category.status, 201);
  const c = await category.json();
  const body = {
    categoryId: c.id,
    amount: '12.99',
    currency: 'USD',
    exchangeRate: '91.375',
    type: 'EXPENSE',
    transactionDate: '2026-09-14',
    description: 'Проверка persistence Stage 5',
  };
  const create = await request('/transactions', 'POST', body, personal);
  assert.equal(create.status, 201);
  const row = await create.json();
  assert.equal(row.amountInBaseCurrency, '1186.96');
  assert.equal(
    (await request(`/transactions/${row.id}`, 'GET', undefined, family)).status,
    404,
  );
  assert.equal(
    (await request('/transactions', 'POST', body, family)).status,
    400,
  );
  const update = await request(
    `/transactions/${row.id}`,
    'PATCH',
    { amount: '20' },
    personal,
  );
  assert.equal(update.status, 200);
  assert.equal((await update.json()).amountInBaseCurrency, '1827.5');
  const deleted = await request(
    '/transactions',
    'POST',
    { ...body, description: 'Удаляемая операция' },
    personal,
  );
  assert.equal(deleted.status, 201);
  const removed = await deleted.json();
  assert.equal(
    (
      await request(
        `/transactions/${removed.id}`,
        'DELETE',
        undefined,
        personal,
      )
    ).status,
    204,
  );
  assert.equal(
    (await request(`/categories/${c.id}`, 'DELETE', undefined, personal))
      .status,
    200,
  );
  const before = await databaseHash();
  await compose('exec', '-T', 'api', 'node', 'dist/prisma/seed.js');
  assert.equal(await databaseHash(), before);
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await databaseHash(), before);
  const persisted = await request(
    `/transactions/${row.id}`,
    'GET',
    undefined,
    personal,
  );
  assert.equal(persisted.status, 200);
  assert.equal((await persisted.json()).amountInBaseCurrency, '1827.5');
  assert.equal(
    (await request(`/transactions/${removed.id}`, 'GET', undefined, personal))
      .status,
    404,
  );
  assert.equal(
    (await request('/auth/logout', 'POST', undefined, personal)).status,
    204,
  );
  console.log(
    'PASS: Stage 5 CRUD, isolation, archive, repeat seed, API restart, edited/deleted persistence',
  );
}
