import {
  BriefcaseBusiness,
  Laptop,
  ShoppingBasket,
  House,
  TramFront,
  Utensils,
  TrainFront,
  Repeat,
  Heart,
  Gift,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import type { CategoryDto } from '@finora/api-client';
const icons = {
  'briefcase-business': BriefcaseBusiness,
  laptop: Laptop,
  'shopping-basket': ShoppingBasket,
  house: House,
  'tram-front': TramFront,
  utensils: Utensils,
  'train-front': TrainFront,
  repeat: Repeat,
  heart: Heart,
  gift: Gift,
  'graduation-cap': GraduationCap,
  wallet: Wallet,
};

export function CategoryMark({
  category,
}: {
  category: Pick<CategoryDto, 'icon' | 'color' | 'name' | 'archivedAt'>;
}) {
  const Icon = icons[category.icon];
  return (
    <span className="category-mark">
      <span className="category-mark__icon">
        <Icon aria-hidden="true" />
        <span
          className="category-mark__color"
          style={{ backgroundColor: category.color }}
        />
      </span>
      <span>
        {category.name}
        {category.archivedAt && <small> · В архиве</small>}
      </span>
    </span>
  );
}
