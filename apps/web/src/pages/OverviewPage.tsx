import { ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../shared/ui/Button';
import { Card, PageContainer, PageHeader, Section } from '../shared/ui/Surface';

export function OverviewPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Обзор"
        description="Ваши финансы. В ясной перспективе."
      />
      <Card className="welcome">
        <div className="welcome__icon">
          <Compass aria-hidden="true" />
        </div>
        <p className="welcome__eyebrow">Меньше неопределённости</p>
        <h2>
          Больше ясности
          <br />в личных финансах
        </h2>
        <p className="welcome__description">
          Доходы, расходы и планы — в одном спокойном пространстве. Здесь
          появится общая картина ваших финансов.
        </p>
        <div className="welcome__notice">
          <span className="welcome__notice-dot" aria-hidden="true" />
          Предварительная версия · Разделы в разработке
        </div>
      </Card>
      <Section
        title="Всё на своих местах"
        description="Познакомьтесь с разделами вашего пространства."
      >
        <div className="overview-links">
          <Link className="destination" to="/transactions">
            <span className="destination__index">01</span>
            <div>
              <h3>Транзакции</h3>
              <p>История доходов и расходов.</p>
            </div>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link className="destination" to="/budgets">
            <span className="destination__index">02</span>
            <div>
              <h3>Бюджеты</h3>
              <p>Планы на каждый месяц.</p>
            </div>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Section>
    </PageContainer>
  );
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
