import { Link } from 'react-router';
import { CsvImportWizard } from '../features/finance/CsvImportWizard';
import { ButtonLink } from '../shared/ui/Button';
import { PageContainer, PageHeader } from '../shared/ui/Surface';

export function ImportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Импорт CSV"
        description="Перенос истории операций из файла: сопоставьте столбцы и категории перед импортом."
        action={
          <ButtonLink variant="secondary">
            <Link to="/transactions">К списку операций</Link>
          </ButtonLink>
        }
      />
      <CsvImportWizard />
    </PageContainer>
  );
}
