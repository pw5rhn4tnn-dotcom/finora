import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
  settingsOptions,
  settingsUpdate,
  type LoginInputDto,
  type RegisterInputDto,
  type ProfileInputDto,
} from '@finora/api-client';
import { z } from 'zod';
const problemSchema = z.object({
  status: z.number(),
  detail: z.string(),
  errors: z.record(z.string(), z.array(z.string())),
});
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string[]>;
  constructor(status: number, data: unknown) {
    const problem = problemSchema.safeParse(data);
    super(
      problem.success
        ? problem.data.detail
        : 'Не удалось выполнить запрос. Попробуйте ещё раз.',
    );
    this.status = status;
    this.fields = problem.success ? problem.data.errors : {};
  }
}
const options = { credentials: 'same-origin' } as const;
export async function currentUser(signal?: AbortSignal) {
  const response = await authMe({ ...options, signal });
  if (response.status === 200) return response.data;
  if (response.status === 401) return null;
  throw new ApiError(response.status, response.data);
}
export async function login(input: LoginInputDto) {
  const response = await authLogin(input, options);
  if (response.status === 200) return response.data;
  throw new ApiError(response.status, response.data);
}
export async function register(input: RegisterInputDto) {
  const response = await authRegister(input, options);
  if (response.status === 201) return response.data;
  throw new ApiError(response.status, response.data);
}
export async function logout() {
  const response = await authLogout(options);
  if (response.status !== 204)
    throw new ApiError(response.status, response.data);
}
export async function preferenceOptions(signal?: AbortSignal) {
  const response = await settingsOptions({ ...options, signal });
  if (response.status === 200) return response.data;
  throw new ApiError(response.status, response.data);
}
export async function updateProfile(input: ProfileInputDto) {
  const response = await settingsUpdate(input, options);
  if (response.status === 200) return response.data;
  throw new ApiError(response.status, response.data);
}
export const safeError = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Нет связи с сервером. Проверьте подключение и повторите попытку.';
