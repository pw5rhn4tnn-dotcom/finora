import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { IconButton } from './Button';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  description,
  children,
  className = '',
  closeDisabled = false,
  ...props
}: Omit<ComponentProps<typeof Dialog.Content>, 'title'> & {
  title: string;
  closeDisabled?: boolean;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content {...props} className={`sheet ${className}`}>
        <div className="sheet__header">
          <div className="min-w-0">
            <Dialog.Title className="sheet__title">{title}</Dialog.Title>
            <Dialog.Description className="sheet__description">
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <IconButton label="Закрыть панель" disabled={closeDisabled}>
              <X aria-hidden="true" />
            </IconButton>
          </Dialog.Close>
        </div>
        <div className="sheet__body">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
