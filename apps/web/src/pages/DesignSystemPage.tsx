import { useState } from 'react';
import { Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button, IconButton } from '../shared/ui/Button';
import { FilterBar, Input, Select } from '../shared/ui/Field';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '../shared/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/States';
import {
  Badge,
  Card,
  Divider,
  PageContainer,
  PageHeader,
  Section,
} from '../shared/ui/Surface';

// Только DEV: изолированная витрина foundation, без domain state/API.
export default function DesignSystemPage() {
  const [feedback, setFeedback] = useState('');
  return (
    <PageContainer>
      <PageHeader
        title="Компоненты интерфейса"
        description="Витрина для разработки. Примеры не связаны с финансовыми данными."
      />
      <Section title="Действия">
        <Card className="sample">
          <div className="sample__row">
            <Button onClick={() => setFeedback('Основное действие выполнено')}>
              Основное действие
            </Button>
            <Button
              variant="secondary"
              onClick={() => setFeedback('Вторичное действие выполнено')}
            >
              Вторичное действие
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFeedback('Дополнительное действие выполнено')}
            >
              Дополнительно
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                setFeedback('Пример действия выполнен; данные не изменялись')
              }
            >
              Пример опасного действия
            </Button>
            <Button disabled>Недоступно</Button>
            <IconButton
              label="Подтвердить пример"
              onClick={() => setFeedback('Пример подтверждён')}
            >
              <Check aria-hidden="true" />
            </IconButton>
          </div>
          <p role="status" className="sample__feedback">
            {feedback}
          </p>
        </Card>
      </Section>
      <Section title="Поля и фильтры">
        <Card className="sample">
          <FilterBar label="Примеры фильтров">
            <Input
              label="Поиск"
              placeholder="Введите текст"
              hint="Подсказка к полю. Данные не отправляются."
            />
            <Select label="Состояние">
              <option value="all">Все состояния</option>
              <option value="ready">Готово</option>
            </Select>
            <Input
              label="Поле с ошибкой"
              error="Проверьте введённое значение."
              defaultValue="Пример"
            />
            <Input
              label="Недоступное поле"
              disabled
              defaultValue="Только пример"
            />
          </FilterBar>
        </Card>
      </Section>
      <Section title="Типографика и статусы">
        <Card className="sample">
          <p className="text-secondary text-text-secondary">
            Пример денежного значения, не баланс
          </p>
          <p className="numeric text-financial font-semibold">12 450,00 ₽</p>
          <Divider />
          <div className="sample__row">
            <Badge>Нейтрально</Badge>
            <Badge tone="primary">Выбрано</Badge>
            <Badge tone="success">
              <ArrowDownLeft aria-hidden="true" className="size-4" />
              Доход
            </Badge>
            <Badge tone="danger">
              <ArrowUpRight aria-hidden="true" className="size-4" />
              Расход
            </Badge>
            <Badge tone="warning">Внимание</Badge>
          </div>
        </Card>
      </Section>
      <Section title="Панель">
        <Card className="sample">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Открыть пример панели</Button>
            </SheetTrigger>
            <SheetContent
              title="Пример панели"
              description="Проверьте Tab, Shift+Tab и закрытие по Escape."
            >
              <div className="sample">
                <Input label="Название примера" />
                <SheetClose asChild>
                  <Button>Готово</Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </Card>
      </Section>
      <Section title="Состояния">
        <div className="states-grid">
          <Card>
            <LoadingState />
          </Card>
          <Card>
            <EmptyState
              title="Пока ничего нет"
              description="Здесь появится содержимое после первого действия."
              action={
                <Button
                  variant="secondary"
                  onClick={() =>
                    setFeedback('Действие пустого состояния выполнено')
                  }
                >
                  Проверить действие
                </Button>
              }
            />
          </Card>
          <Card>
            <ErrorState
              action={
                <Button
                  variant="secondary"
                  onClick={() => setFeedback('Повтор запрошен')}
                >
                  Повторить
                </Button>
              }
            />
          </Card>
        </div>
      </Section>
    </PageContainer>
  );
}
