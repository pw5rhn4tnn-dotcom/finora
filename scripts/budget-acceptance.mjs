import assert from 'node:assert/strict';
export async function budgetAcceptance(url, compose, databaseHash) {
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
  );
  const family = await login('family@finora.example', 'Finora-Family-2026!');
  const options = await (
    await request('/categories/options', 'GET', undefined, personal)
  ).json();
  const otherOptions = await (
    await request('/categories/options', 'GET', undefined, family)
  ).json();
  const categoryId = options.find((c) => c.name === 'Продукты').id;
  const otherCategoryId = otherOptions.find((c) => c.name === 'Продукты').id;
  const input = { categoryId, year: 2031, month: 12, limitAmount: '0.30' };
  const create = await request('/budgets', 'POST', input, personal);
  assert.equal(create.status, 201);
  const row = await create.json();
  assert.equal(
    (await request('/budgets', 'POST', input, personal)).status,
    409,
  );
  const other = await request(
    '/budgets',
    'POST',
    { ...input, categoryId: otherCategoryId },
    family,
  );
  assert.equal(other.status, 201);
  const otherRow = await other.json();
  for (const method of ['GET', 'PATCH', 'DELETE'])
    assert.equal(
      (
        await request(
          `/budgets/${otherRow.id}`,
          method,
          method === 'PATCH' ? { limitAmount: '1' } : undefined,
          personal,
        )
      ).status,
      404,
    );
  assert.equal(
    (
      await request(
        '/budgets',
        'POST',
        { ...input, month: 11, categoryId: otherCategoryId },
        personal,
      )
    ).status,
    400,
  );
  const transaction = {
    categoryId,
    type: 'EXPENSE',
    amount: '0.10',
    currency: 'RUB',
    transactionDate: '2031-12-31',
    description: 'Compose Stage 6',
  };
  for (const amount of ['0.10', '0.20'])
    assert.equal(
      (
        await request(
          '/transactions',
          'POST',
          { ...transaction, amount },
          personal,
        )
      ).status,
      201,
    );
  assert.equal(
    (
      await request(
        '/transactions',
        'POST',
        { ...transaction, categoryId: otherCategoryId, amount: '999' },
        family,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        '/transactions',
        'POST',
        { ...transaction, transactionDate: '2032-01-01', amount: '999' },
        personal,
      )
    ).status,
    201,
  );
  const actual = await (
    await request(`/budgets/${row.id}`, 'GET', undefined, personal)
  ).json();
  assert.equal(actual.spent, '0.3');
  assert.equal(actual.progress, '100.00');
  const changed = await request(
    `/budgets/${row.id}`,
    'PATCH',
    { limitAmount: '0.20' },
    personal,
  );
  assert.equal(changed.status, 200);
  assert.equal((await changed.json()).remaining, '-0.1');
  const deleted = await request(
    '/budgets',
    'POST',
    { ...input, month: 11 },
    personal,
  );
  assert.equal(deleted.status, 201);
  const removed = await deleted.json();
  assert.equal(
    (await request(`/budgets/${removed.id}`, 'DELETE', undefined, personal))
      .status,
    204,
  );
  const hash = await databaseHash();
  await compose('exec', '-T', 'api', 'node', 'dist/prisma/seed.js');
  assert.equal(await databaseHash(), hash);
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await databaseHash(), hash);
  assert.equal(
    (await request(`/budgets/${removed.id}`, 'GET', undefined, personal))
      .status,
    404,
  );
  const persisted = await (
    await request(`/budgets/${row.id}`, 'GET', undefined, personal)
  ).json();
  assert.equal(persisted.limitAmount, '0.2');
  assert.equal(persisted.spent, '0.3');
  assert.equal(persisted.overBudget, true);
  const list = await (
    await request('/budgets?year=2031&month=12', 'GET', undefined, personal)
  ).json();
  assert.equal(list.total, 1);
  assert.equal(list.items[0].id, row.id);
  console.log(
    'PASS Stage 6 Compose: budget CRUD, actual Decimal/date, duplicate/ownership/isolation, seed/restart persistence',
  );
}
