import { usePreferenceOptions } from '../features/profile/preferences-query';
import { useForm } from 'react-hook-form';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { UserDto } from '@finora/api-client';
import {
  useAuth,
  sessionKey,
  replaceSession,
} from '../features/auth/auth-context';
import {
  profileSchema,
  showFormError,
  validateForm,
  useFormErrorFocus,
} from '../features/auth/form-validation';
import {
  PreferenceFields,
  type AccountFields,
} from '../features/profile/PreferenceFields';
import { ApiError, updateProfile } from '../shared/api/client';
import { Button } from '../shared/ui/Button';
import { Card, PageContainer, PageHeader } from '../shared/ui/Surface';

function ProfileForm({ user }: { user: UserDto }) {
  const client = useQueryClient();
  const preferences = usePreferenceOptions();
  const form = useForm<AccountFields>({
    defaultValues: { ...user, password: '' },
  });
  const save = useMutation({
    mutationKey: ['account-write'],
    mutationFn: async (data: AccountFields) => {
      const input = validateForm(form, profileSchema, data);
      if (!input) return false;
      const updated = await updateProfile(input);
      if (client.getQueryData<UserDto | null>(sessionKey)?.id !== user.id)
        return false;
      await client.cancelQueries({ queryKey: sessionKey });
      client.setQueryData(sessionKey, updated);
      form.reset({ ...updated, password: '' });
      return true;
    },
    onError: async (error) => {
      if (client.getQueryData<UserDto | null>(sessionKey)?.id !== user.id)
        return;
      showFormError(form, error);
      if (error instanceof ApiError && error.status === 401) {
        await replaceSession(client, null);
      }
      if (error instanceof ApiError && error.status === 409)
        await client.invalidateQueries({ queryKey: sessionKey });
    },
    retry: false,
  });
  const pending = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  useFormErrorFocus(form, pending);
  return (
    <Card className="profile-card">
      <h2 className="text-section font-semibold">Профиль</h2>
      <p className="profile-email">{user.email}</p>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((data) => save.mutate(data))(event);
        }}
      >
        <fieldset
          className="account-form"
          disabled={pending}
          aria-busy={save.isPending}
        >
          <legend className="sr-only">Настройки профиля</legend>
          <PreferenceFields form={form} locked={user.baseCurrencyLocked} />
          {form.formState.errors.root && (
            <p role="alert" className="field__error">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              pending || !preferences.isSuccess || !form.formState.isDirty
            }
          >
            {save.isPending ? 'Сохраняем…' : 'Сохранить изменения'}
          </Button>
        </fieldset>
        <p role="status">
          {save.isPending
            ? 'Сохраняем настройки…'
            : save.isSuccess && save.data && !form.formState.isDirty
              ? 'Настройки сохранены.'
              : ''}
        </p>
      </form>
    </Card>
  );
}
export function SettingsPage() {
  const session = useAuth();
  return (
    <PageContainer>
      <PageHeader title="Настройки" description="Ваш профиль и предпочтения." />
      {session.isFetching && <p role="status">Обновляем профиль…</p>}
      {session.data && (
        <ProfileForm key={session.data.id} user={session.data} />
      )}
    </PageContainer>
  );
}
