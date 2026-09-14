import { usePreferenceOptions } from '../features/profile/preferences-query';
import { useEffect } from 'react';
import type { UserDto } from '@finora/api-client';
import { Link, Navigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Brand } from '../app/Brand';
import { useAuth, replaceSession } from '../features/auth/auth-context';
import {
  loginSchema,
  registrationSchema,
  showFormError,
  validateForm,
  useFormErrorFocus,
} from '../features/auth/form-validation';
import {
  PreferenceFields,
  type AccountFields,
} from '../features/profile/PreferenceFields';
import { login, register, safeError } from '../shared/api/client';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Field';
import { Card, PageHeader } from '../shared/ui/Surface';
import { ErrorState, LoadingState } from '../shared/ui/States';
import '../features/auth/auth.css';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const session = useAuth();
  const preferences = usePreferenceOptions(registering);
  const client = useQueryClient();
  const location = useLocation();
  const title = registering ? 'Создать аккаунт' : 'Войти в Finora';
  const form = useForm<AccountFields>({
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      baseCurrency: 'RUB',
      timeZone: 'Europe/Moscow',
    },
  });
  useEffect(() => {
    document.title = `${title} — Finora`;
    document.getElementById('auth-title')?.focus();
  }, [title]);
  const mutation = useMutation({
    mutationKey: ['account-write'],
    mutationFn: async (data: AccountFields) => {
      let user: UserDto;
      if (registering) {
        const input = validateForm(form, registrationSchema, data);
        if (!input) return;
        await client.cancelQueries();
        user = await register(input);
      } else {
        const input = validateForm(form, loginSchema, data);
        if (!input) return;
        await client.cancelQueries();
        user = await login(input);
      }
      await replaceSession(client, user);
      return user;
    },
    onError: (error) => showFormError(form, error),
    retry: false,
  });
  const pending = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  useFormErrorFocus(form, pending);
  if (session.data)
    return (
      <Navigate
        to="/"
        replace
        state={
          mutation.variables
            ? {
                notice: registering
                  ? 'Аккаунт создан. Стандартные категории готовы.'
                  : 'Вы вошли в аккаунт.',
              }
            : undefined
        }
      />
    );
  return (
    <main className="auth-page">
      <Brand />
      <Card className="auth-card">
        <div id="auth-title" tabIndex={-1}>
          <PageHeader
            title={title}
            description={
              registering
                ? 'Начните с профиля, валюты и часового пояса.'
                : 'Ваше личное финансовое пространство.'
            }
          />
        </div>
        {location.state &&
          typeof location.state === 'object' &&
          'from' in location.state && (
            <p role="status">Войдите, чтобы открыть своё пространство.</p>
          )}
        {session.isPending ? (
          <LoadingState label="Проверяем сессию…" />
        ) : session.isError ? (
          <ErrorState
            description={safeError(session.error)}
            action={
              <Button onClick={() => void session.refetch()}>Повторить</Button>
            }
          />
        ) : (
          <>
            <form
              noValidate
              onSubmit={(event) => {
                void form.handleSubmit((data) => mutation.mutate(data))(event);
              }}
            >
              <fieldset
                className="account-form"
                disabled={pending}
                aria-busy={pending}
              >
                <legend className="sr-only">{title}</legend>
                {registering && <PreferenceFields form={form} />}
                <Input
                  label="Email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  {...form.register('email')}
                  error={form.formState.errors.email?.message}
                />
                <Input
                  label="Пароль"
                  type="password"
                  autoComplete={
                    registering ? 'new-password' : 'current-password'
                  }
                  maxLength={128}
                  hint={
                    registering
                      ? 'От 12 до 128 символов. Пароль можно вставить из менеджера паролей.'
                      : undefined
                  }
                  {...form.register('password')}
                  error={form.formState.errors.password?.message}
                />
                {form.formState.errors.root && (
                  <p role="alert" className="field__error">
                    {form.formState.errors.root.message}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={pending || (registering && !preferences.isSuccess)}
                >
                  {pending
                    ? 'Подождите…'
                    : registering
                      ? 'Зарегистрироваться'
                      : 'Войти'}
                </Button>
              </fieldset>
              <span className="sr-only" role="status">
                {pending ? 'Отправляем данные…' : ''}
              </span>
            </form>
            <p>
              {registering ? 'Уже есть аккаунт?' : 'Впервые здесь?'}{' '}
              <Link to={registering ? '/login' : '/register'}>
                {registering ? 'Войти' : 'Создать аккаунт'}
              </Link>
            </p>
            {!registering && (
              <section className="demo-access" aria-labelledby="demo-title">
                <h2 id="demo-title">Попробуйте демо</h2>
                <p>Два независимых профиля с готовыми данными.</p>
                {[
                  {
                    label: 'Личный профиль',
                    email: 'personal@finora.example',
                    password: 'Finora-Personal-2026!',
                  },
                  {
                    label: 'Семейный профиль',
                    email: 'family@finora.example',
                    password: 'Finora-Family-2026!',
                  },
                ].map((demo) => (
                  <div key={demo.email}>
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => {
                        form.setValue('email', demo.email);
                        form.setValue('password', demo.password);
                        mutation.mutate(form.getValues());
                      }}
                    >
                      {demo.label}
                    </Button>
                    <p>
                      {demo.email}
                      <br />
                      Пароль: <span>{demo.password}</span>
                    </p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </Card>
    </main>
  );
}
