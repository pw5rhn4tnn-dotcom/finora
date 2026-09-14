import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      {
        message: password,
        nonce: salt,
        parallelism: 1,
        tagLength: 32,
        memory: 65536,
        passes: 3,
      },
      (error, hash) => (error ? reject(error) : resolve(hash)),
    );
  });
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `$argon2id$v=19$m=65536,t=3,p=1$${salt.toString('base64').replaceAll('=', '')}$${(await derive(password, salt)).toString('base64').replaceAll('=', '')}`;
}
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts =
    /^\$argon2id\$v=19\$m=65536,t=3,p=1\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/.exec(
      encoded,
    );
  if (!parts?.[1] || !parts[2])
    throw new Error('Некорректный формат сохранённого хеша пароля');
  return timingSafeEqual(
    await derive(password, Buffer.from(parts[1], 'base64')),
    Buffer.from(parts[2], 'base64'),
  );
}
