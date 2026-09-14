import { Construction } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/States';
import { Badge, Card, PageContainer, PageHeader } from '../shared/ui/Surface';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        action={<Badge>В разработке</Badge>}
      />
      <Card>
        <EmptyState
          icon={Construction}
          title="Здесь появится ваш новый раздел"
          description="Сейчас доступен предварительный просмотр интерфейса. Возможности этого раздела появятся в следующих версиях."
          action={
            <ButtonLink variant="secondary">
              <Link to="/">Вернуться к обзору</Link>
            </ButtonLink>
          }
        />
      </Card>
    </PageContainer>
  );
}
