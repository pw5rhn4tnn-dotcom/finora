import { useMutation } from '@tanstack/react-query';
import {
  importsCreate,
  importsPreview,
  importsValidate,
  type ImportAnalysisDto,
  type ImportPreviewDto,
  type ImportResultDto,
} from '@finora/api-client';
import { unwrap, useFinanceSession, useFinancialMutation } from './api';

export interface ImportOptionsInput {
  file: File;
  mapping: Record<string, string>;
  categoryMap: Record<string, string>;
  rates: Record<string, string>;
  includeDuplicates: boolean;
}
function toBody(input: ImportOptionsInput) {
  return {
    file: input.file,
    mapping: JSON.stringify(input.mapping),
    categoryMap: JSON.stringify(input.categoryMap),
    rates: JSON.stringify(input.rates),
    includeDuplicates: input.includeDuplicates ? 'true' : 'false',
  };
}
export function useImportPreview() {
  const { guard } = useFinanceSession();
  return useMutation({
    mutationKey: ['csv-import-preview'],
    mutationFn: (file: File) =>
      guard(
        async () => unwrap(await importsPreview({ file })) as ImportPreviewDto,
      ),
    retry: false,
  });
}
export function useImportValidate() {
  const { guard } = useFinanceSession();
  return useMutation({
    mutationKey: ['csv-import-validate'],
    mutationFn: (input: ImportOptionsInput) =>
      guard(
        async () =>
          unwrap(await importsValidate(toBody(input))) as ImportAnalysisDto,
      ),
    retry: false,
  });
}
// Коммит меняет финансовые данные, поэтому переиспользует общую границу
// account-write: блокирует logout на время запроса и после успеха
// инвалидирует finance queries (transactions/budgets/dashboard) так же, как
// любая другая финансовая мутация (features/finance/api.ts).
export function useImportCommit(onSuccess: (result: ImportResultDto) => void) {
  return useFinancialMutation<ImportOptionsInput, ImportResultDto>(
    async (input) =>
      unwrap(await importsCreate(toBody(input))) as ImportResultDto,
    onSuccess,
  );
}
