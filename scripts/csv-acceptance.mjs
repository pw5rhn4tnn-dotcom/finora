import assert from 'node:assert/strict';

function csvBuffer(headers, rows) {
  const escape = (v) =>
    /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
  return (
    [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n'
  );
}

export async function csvAcceptance(url, compose, databaseHash) {
  const json = (path, method, data, cookie) =>
    fetch(`${url}/api/v1${path}`, {
      method,
      headers: {
        Origin: url,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  const multipart = (path, fields, cookie) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields))
      formData.append(key, value);
    return fetch(`${url}/api/v1${path}`, {
      method: 'POST',
      headers: { Origin: url, ...(cookie ? { Cookie: cookie } : {}) },
      body: formData,
    });
  };
  async function login(email, password) {
    const r = await json('/auth/login', 'POST', { email, password });
    assert.equal(r.status, 200);
    return r.headers.get('set-cookie').split(';')[0];
  }
  const personal = await login(
    'personal@finora.example',
    'Finora-Personal-2026!',
  );
  const family = await login('family@finora.example', 'Finora-Family-2026!');
  const options = await (
    await json('/categories/options', 'GET', undefined, personal)
  ).json();
  const familyOptions = await (
    await json('/categories/options', 'GET', undefined, family)
  ).json();
  const groceries = options.find((c) => c.name === 'Продукты').id;
  const familyGroceries = familyOptions.find((c) => c.name === 'Продукты').id;

  // 401 без сессии
  assert.equal(
    (
      await multipart('/imports/preview', {
        file: new File(['a,b\n1,2'], 'probe.csv', { type: 'text/csv' }),
      })
    ).status,
    401,
  );

  const headers = [
    'date',
    'type',
    'amount',
    'currency',
    'category',
    'description',
  ];
  const mapping = JSON.stringify({
    transactionDate: 'date',
    type: 'type',
    amount: 'amount',
    currency: 'currency',
    category: 'category',
    description: 'description',
  });
  const marker = `Docker CSV acceptance ${Date.now()}`;
  const csv = csvBuffer(headers, [
    ['2026-09-05', 'EXPENSE', '250.00', 'RUB', 'Продукты', marker],
    ['2026-09-06', 'EXPENSE', 'oops', 'RUB', 'Продукты', `${marker} invalid`],
  ]);
  const file = () => new File([csv], 'transactions.csv', { type: 'text/csv' });

  // preview: структура файла, без validation
  const preview = await multipart(
    '/imports/preview',
    { file: file() },
    personal,
  );
  assert.equal(preview.status, 200);
  const previewBody = await preview.json();
  assert.deepEqual(previewBody.columns, headers);
  assert.equal(previewBody.totalRows, 2);

  // ownership: чужая категория не создаёт запись ни при каких условиях
  const foreignAttempt = await multipart(
    '/imports',
    {
      file: file(),
      mapping,
      categoryMap: JSON.stringify({ Продукты: familyGroceries }),
      rates: '{}',
    },
    personal,
  );
  assert.equal(foreignAttempt.status, 201);
  const foreignBody = await foreignAttempt.json();
  assert.equal(
    foreignBody.imported,
    0,
    'чужая категория не должна создать операцию',
  );

  // commit: partial import (1 valid + 1 invalid), audit/ownership корректны
  const categoryMap = JSON.stringify({ Продукты: groceries });
  const commit = await multipart(
    '/imports',
    { file: file(), mapping, categoryMap, rates: '{}' },
    personal,
  );
  assert.equal(commit.status, 201);
  const commitBody = await commit.json();
  assert.equal(commitBody.imported, 1);
  assert.equal(commitBody.invalidRows, 1);
  assert.equal(commitBody.duplicateRows, 0);

  const list = await (
    await json(
      `/transactions?search=${encodeURIComponent(marker)}&pageSize=50`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(list.total, 1, 'создана ровно одна валидная строка');
  const created = list.items[0];
  assert.equal(created.source, 'CSV');
  assert.equal(created.amount, '250');

  // Семья не видит операцию личного профиля.
  const familyList = await (
    await json(
      `/transactions?search=${encodeURIComponent(marker)}`,
      'GET',
      undefined,
      family,
    )
  ).json();
  assert.equal(familyList.total, 0);

  // Повторный импорт того же файла: дубль по умолчанию пропускается.
  const repeated = await multipart(
    '/imports',
    { file: file(), mapping, categoryMap, rates: '{}' },
    personal,
  );
  const repeatedBody = await repeated.json();
  assert.equal(repeatedBody.imported, 0);
  assert.equal(repeatedBody.duplicateRows, 1);

  // Explicit includeDuplicates создаёт второй набор.
  const explicit = await multipart(
    '/imports',
    {
      file: file(),
      mapping,
      categoryMap,
      rates: '{}',
      includeDuplicates: 'true',
    },
    personal,
  );
  const explicitBody = await explicit.json();
  assert.equal(explicitBody.imported, 1);

  const afterDuplicate = await (
    await json(
      `/transactions?search=${encodeURIComponent(marker)}&pageSize=50`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(afterDuplicate.total, 2);

  // Экспорт: BOM, CRLF, Content-Disposition, formula injection protection.
  // Отдельный маркер (не подстрока `marker`), чтобы не попасть в более
  // ранние/поздние проверки количества CSV-импортированных строк по search.
  const injectionMarker = `Docker CSV injection ${Date.now()}`;
  const injectionCategory = await json(
    '/categories',
    'POST',
    { name: '=SUM(1)', type: 'EXPENSE', icon: 'wallet', color: '#123456' },
    personal,
  );
  assert.equal(injectionCategory.status, 201);
  const injectionCategoryId = (await injectionCategory.json()).id;
  const injectionTx = await json(
    '/transactions',
    'POST',
    {
      amount: '5',
      currency: 'RUB',
      categoryId: injectionCategoryId,
      type: 'EXPENSE',
      transactionDate: '2026-09-05',
      description: `=cmd|/c calc ${injectionMarker}`,
    },
    personal,
  );
  assert.equal(injectionTx.status, 201);
  const exportResponse = await fetch(
    `${url}/api/v1/transactions/export?dateFrom=2026-09-05&dateTo=2026-09-06`,
    { headers: { Cookie: personal } },
  );
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get('content-type') ?? '', /text\/csv/);
  assert.match(
    exportResponse.headers.get('content-disposition') ?? '',
    /^attachment; filename="finora-transactions-\d{4}-\d{2}-\d{2}\.csv"$/,
  );
  const exportBytes = new Uint8Array(await exportResponse.arrayBuffer());
  assert.equal(exportBytes[0], 0xef);
  assert.equal(exportBytes[1], 0xbb);
  assert.equal(exportBytes[2], 0xbf);
  const exportText = new TextDecoder('utf-8').decode(exportBytes);
  assert.ok(exportText.includes(`'=cmd|/c calc ${injectionMarker}`));
  assert.ok(exportText.includes(`'=SUM(1)`));
  assert.ok(!exportText.includes(`,=cmd|/c calc ${injectionMarker}`));
  assert.ok(exportText.includes('\r\n'));

  // Персистентность после restart: импортированные операции переживают
  // перезапуск контейнера api так же, как обычные CRUD-записи (budget/finance).
  const hash = await databaseHash();
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await databaseHash(), hash);
  const persisted = await (
    await json(
      `/transactions?search=${encodeURIComponent(marker)}&pageSize=50`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(persisted.total, 2);

  console.log(
    'PASS Stage 9 Compose: CSV preview/validate/import, partial/atomic policy, ownership, повторный импорт/дубли, экспорт BOM/CRLF/formula injection, restart persistence',
  );
}
