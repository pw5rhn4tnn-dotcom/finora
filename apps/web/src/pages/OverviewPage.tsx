import { Link } from 'react-router';
import { useAuth } from '../features/auth/auth-context';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ButtonLink } from '../shared/ui/Button';
import { PageContainer, PageHeader } from '../shared/ui/Surface';
export function OverviewPage() {
  const user = useAuth().data;
  return user ? <Dashboard key={user.id} /> : null;
}

export function NotFoundPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Страница не найдена"
        description="Возможно, адрес изменился или в нём есть опечатка."
      />
      <div>
        <ButtonLink>
          <Link to="/">Вернуться к обзору</Link>
        </ButtonLink>
      </div>
    </PageContainer>
  );
}
