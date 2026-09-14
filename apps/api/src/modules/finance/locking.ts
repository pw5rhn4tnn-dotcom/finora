import { Prisma } from '../../generated/prisma/client.js';
import { Problem } from '../../common/problem.js';
export async function lockOwner(db: Prisma.TransactionClient, userId: string) {
  await db.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user)
    throw new Problem(401, 'authentication_error', 'Войдите в аккаунт');
  return user;
}
export function notFound(): never {
  throw new Problem(404, 'not_found', 'Ресурс не найден');
}
