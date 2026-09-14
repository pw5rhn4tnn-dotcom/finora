import { z } from 'zod';
import {
  categoriesCreate,
  categoriesUpdate,
  CategoryInputDtoIcon,
  type CategoryDto,
  type CategoryInputDto,
} from '@finora/api-client';
import { Button } from '../../shared/ui/Button';
import { Input, Select } from '../../shared/ui/Field';
import { SheetContent } from '../../shared/ui/Sheet';
import { useFinancialMutation, unwrap } from './api';
import { useFinancialForm } from './form';
import { CategoryMark } from './CategoryMark';
import { iconNames } from './icon-names';
const fields = ['name', 'type', 'icon', 'color'] as const;
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название')
    .max(100, 'Не более 100 символов'),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.enum(CategoryInputDtoIcon),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB'),
});
export function CategoryForm({
  category,
  close,
  restoreFocus,
}: {
  category?: CategoryDto;
  close: () => void;
  restoreFocus?: () => void;
}) {
  const { form, parse, showError } = useFinancialForm<CategoryInputDto>(
    category ?? { name: '', type: 'EXPENSE', icon: 'wallet', color: '#4F46E5' },
    schema,
    fields,
  );
  const save = useFinancialMutation(
    async (input: CategoryInputDto) =>
      unwrap(
        await (category
          ? categoriesUpdate(category.id, input)
          : categoriesCreate(input)),
      ),
    close,
  );
  const pending = save.isPending || form.formState.isSubmitting;
  const values = form.watch();
  return (
    <SheetContent
      closeDisabled={pending}
      onCloseAutoFocus={
        restoreFocus
          ? (e) => {
              e.preventDefault();
              restoreFocus();
            }
          : undefined
      }
      title={category ? 'Изменить категорию' : 'Новая категория'}
      description="Название, тип и оформление вашей категории."
    >
      <form
        noValidate
        onSubmit={(e) => {
          void form.handleSubmit(async (data) => {
            if (pending) return;
            const input = parse(data);
            if (!input) return;
            try {
              await save.mutateAsync(input);
            } catch (error) {
              showError(error);
            }
          })(e);
        }}
      >
        <fieldset className="finance-form" disabled={pending}>
          <legend className="sr-only">Поля категории</legend>
          <Input
            label="Название"
            maxLength={100}
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Тип"
            {...form.register('type')}
            error={form.formState.errors.type?.message}
          >
            <option value="EXPENSE">Расход</option>
            <option value="INCOME">Доход</option>
          </Select>
          <Select label="Иконка" {...form.register('icon')}>
            {Object.entries(iconNames).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Цвет"
            type="color"
            {...form.register('color')}
            error={form.formState.errors.color?.message}
          />
          <CategoryMark category={{ ...values, archivedAt: null }} />
          {form.formState.errors.root && (
            <p role="alert" className="field__error">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Сохранить категорию'}
          </Button>
        </fieldset>
        <p role="status">{pending ? 'Сохраняем категорию…' : ''}</p>
      </form>
    </SheetContent>
  );
}
