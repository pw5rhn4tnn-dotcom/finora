import assert from 'node:assert/strict';
export async function auditAcceptance(url, compose, databaseHash) {
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
  const categoryId = options.find((c) => c.name === 'Продукты').id;
  // Read-only ресурс: у него нет мутирующих методов ни для одной сессии.
  for (const method of ['POST', 'PATCH', 'DELETE'])
    assert.equal(
      (
        await request(
          '/audit-log',
          method,
          method === 'POST' ? {} : undefined,
          personal,
        )
      ).status,
      404,
    );
  const created = await request(
    '/transactions',
    'POST',
    {
      categoryId,
      type: 'EXPENSE',
      amount: '12.34',
      currency: 'RUB',
      transactionDate: '2031-06-15',
      description: 'Compose Stage 10',
    },
    personal,
  );
  assert.equal(created.status, 201);
  const row = await created.json();
  const updated = await request(
    `/transactions/${row.id}`,
    'PATCH',
    { description: 'Compose Stage 10 изменено' },
    personal,
  );
  assert.equal(updated.status, 200);
  assert.equal(
    (await request(`/transactions/${row.id}`, 'DELETE', undefined, personal))
      .status,
    204,
  );
  const history = await (
    await request(
      `/audit-log?entityId=${row.id}&entityType=Transaction`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(history.total, 3);
  assert.deepEqual(
    history.items.map((r) => r.action),
    ['DELETE', 'UPDATE', 'CREATE'],
  );
  assert.equal(history.items[2].before, null);
  assert.equal(history.items[2].after.description, 'Compose Stage 10');
  assert.equal(history.items[1].before.description, 'Compose Stage 10');
  assert.equal(history.items[1].after.description, 'Compose Stage 10 изменено');
  assert.equal(history.items[0].after, null);
  assert.equal(
    history.items[0].before.description,
    'Compose Stage 10 изменено',
  );
  // Чужая сессия не видит записи владельца, даже зная точный entityId.
  const foreign = await (
    await request(
      `/audit-log?entityId=${row.id}&entityType=Transaction`,
      'GET',
      undefined,
      family,
    )
  ).json();
  assert.equal(foreign.total, 0);
  const hash = await databaseHash();
  await compose('exec', '-T', 'api', 'node', 'dist/prisma/seed.js');
  assert.equal(await databaseHash(), hash);
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await databaseHash(), hash);
  const persisted = await (
    await request(
      `/audit-log?entityId=${row.id}&entityType=Transaction`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(persisted.total, 3);
  console.log(
    'PASS Stage 10 Compose: read-only audit-log, ownership isolation, full CRUD history, seed/restart persistence',
  );
}
