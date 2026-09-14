import { usePreferenceOptions } from './preferences-query';
import { safeError } from '../../shared/api/client';
import { Input, Select } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { ErrorState, LoadingState } from '../../shared/ui/States';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterInputDto } from '@finora/api-client';

export type AccountFields = RegisterInputDto;
export function PreferenceFields({
  form,
  locked = false,
}: {
  form: UseFormReturn<AccountFields>;
  locked?: boolean;
}) {
  const options = usePreferenceOptions();
  const errors = form.formState.errors;
  return (
    <>
      <Input
        label="Имя профиля"
        autoComplete="name"
        maxLength={100}
        {...form.register('displayName')}
        error={errors.displayName?.message}
      />
      {options.isPending ? (
        <LoadingState label="Загружаем валюты и часовые пояса…" />
      ) : options.isError ? (
        <ErrorState
          description={safeError(options.error)}
          action={
            <Button onClick={() => void options.refetch()}>
              Повторить загрузку справочников
            </Button>
          }
        />
      ) : (
        <>
          <Select
            label="Основная валюта"
            {...form.register('baseCurrency')}
            disabled={locked}
            error={errors.baseCurrency?.message}
            hint={
              locked
                ? 'Валюта закреплена финансовой историей. Изменить её нельзя.'
                : 'После появления финансовых данных изменить валюту нельзя.'
            }
          >
            {options.data.currencies.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select
            label="Часовой пояс"
            {...form.register('timeZone')}
            error={errors.timeZone?.message}
            hint="Используется для календарных событий; даты истории не сдвигаются."
          >
            {options.data.timeZones.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </>
      )}
    </>
  );
}
