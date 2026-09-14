import { Button } from '../../shared/ui/Button';
import { Select } from '../../shared/ui/Field';
export function Pagination({
  page,
  pageSize,
  total,
  pending,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  pending: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="finance-pagination" aria-label="Страницы списка">
      <p aria-live="polite">
        Найдено: {total}. Страница {page} из {pages}.
      </p>
      <div className="finance-actions">
        <Button
          variant="secondary"
          disabled={pending || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Назад
        </Button>
        <Button
          variant="secondary"
          disabled={pending || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Далее
        </Button>
      </div>
      <Select
        label="На странице"
        value={pageSize}
        onChange={(e) => onPageSize(Number(e.target.value))}
      >
        {[10, 25, 50].map((size) => (
          <option value={size} key={size}>
            {size}
          </option>
        ))}
      </Select>
      {page > pages && (
        <Button onClick={() => onPage(1)}>К первой странице</Button>
      )}
    </nav>
  );
}
