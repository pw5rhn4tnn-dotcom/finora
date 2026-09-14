import assert from 'node:assert/strict';

export async function dashboardAcceptance(url, compose, databaseHash) {
  const request = (path, cookie) =>
    fetch(`${url}/api/v1${path}`, {
      headers: cookie ? { Cookie: cookie } : {},
    });
  async function login(email, password) {
    const r = await fetch(`${url}/api/v1/auth/login`, {
      method: 'POST',
      headers: { Origin: url, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(r.status, 200);
    return r.headers.get('set-cookie').split(';')[0];
  }
  const own = await login('personal@finora.example', 'Finora-Personal-2026!');
  const other = await login('family@finora.example', 'Finora-Family-2026!');
  assert.equal((await request('/dashboard?year=2026&month=9')).status, 401);
  const me = await (await request('/auth/me', own)).json();
  const read = async (cookie, year = 2026, month = 9) => {
    const r = await request(`/dashboard?year=${year}&month=${month}`, cookie);
    assert.equal(r.status, 200);
    return r.json();
  };
  const beforeHash = await databaseHash();
  const snapshot = await read(own);
  const family = await read(other);
  assert.equal(snapshot.trend.length, 6);
  assert.equal(snapshot.topCategories.length, 5);
  assert.deepEqual(snapshot.topCategories, snapshot.distribution.slice(0, 5));
  assert.notEqual(snapshot.expense, family.expense);
  assert.equal(snapshot.income, '118500');
  assert.ok(snapshot.insights.length >= 2 && snapshot.insights.length <= 4);
  assert.equal(
    (await request(`/dashboard?year=2026&month=9&userId=${me.id}`, own)).status,
    400,
  );
  const sql = `SELECT json_build_object('income', COALESCE(SUM("amountInBaseCurrency") FILTER (WHERE type='INCOME'),0)::text, 'expense', COALESCE(SUM("amountInBaseCurrency") FILTER (WHERE type='EXPENSE'),0)::text) FROM transactions WHERE "userId"='${me.id}'::uuid AND "transactionDate">=DATE '2026-09-01' AND "transactionDate"<DATE '2026-10-01'`;
  const result = JSON.parse(
    (
      await compose(
        'exec',
        '-T',
        'postgres',
        'psql',
        '-U',
        'finora_migrator',
        '-d',
        'finora',
        '-Atc',
        sql,
      )
    ).trim(),
  );
  const trim = (value) =>
    value.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  assert.equal(snapshot.income, trim(result.income));
  assert.equal(snapshot.expense, trim(result.expense));
  const budgets = await (
    await request('/budgets?year=2026&month=9&pageSize=50', own)
  ).json();
  for (const b of snapshot.budgets)
    assert.deepEqual(
      b,
      budgets.items.find((row) => row.id === b.id),
    );
  const empty = await read(own, 2999, 12);
  assert.equal(empty.hasTransactions, false);
  assert.equal(empty.savingsRate, null);
  assert.deepEqual(empty.insights, []);
  assert.equal(
    await databaseHash(),
    beforeHash,
    'GET не меняет данные и audit',
  );
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.deepEqual(
    await read(own),
    snapshot,
    'Снимок сохраняется после startup/seed',
  );
  assert.equal(await databaseHash(), beforeHash);
  console.log(
    'PASS Dashboard: SQL aggregate/KPI/top5/budgets, two owners, strict query, empty, read-only and restart/seed persistence',
  );
}
