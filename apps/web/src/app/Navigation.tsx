import { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '../shared/ui/Sheet';
import {
  moreNavigation,
  primaryNavigation,
  type NavigationItem,
} from './navigation-config';
import { Brand } from './Brand';

function NavigationLink({
  item,
  mobile = false,
}: {
  item: NavigationItem;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={mobile ? 'bottom-link' : 'nav-link'}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Основная навигация" className="sidebar__navigation">
        <p className="nav-caption">Личные финансы</p>
        <ul>
          {primaryNavigation.map((item) => (
            <li key={item.to}>
              <NavigationLink item={item} />
            </li>
          ))}
          <li>
            <NavigationLink item={moreNavigation[0]} />
          </li>
        </ul>
        <p className="nav-caption nav-caption--group">Управление</p>
        <ul>
          {moreNavigation.slice(1, 3).map((item) => (
            <li key={item.to}>
              <NavigationLink item={item} />
            </li>
          ))}
        </ul>
        <div className="sidebar__settings">
          <NavigationLink item={moreNavigation[3]} />
        </div>
      </nav>
      <div className="sidebar__note">
        <span className="sidebar__note-mark" aria-hidden="true" />
        <span>
          Больше ясности.
          <br />
          Больше спокойствия.
        </span>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const navigating = useRef(false);
  const location = useLocation();
  const moreActive = moreNavigation.some(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`),
  );
  return (
    <nav className="bottom-navigation" aria-label="Мобильная навигация">
      <ul>
        {primaryNavigation.map((item) => (
          <li key={item.to}>
            <NavigationLink item={item} mobile />
          </li>
        ))}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={`bottom-link ${moreActive ? 'active' : ''}`}
                aria-label={moreActive ? 'Ещё — текущий раздел' : 'Ещё'}
              >
                <MoreHorizontal aria-hidden="true" />
                <span>Ещё</span>
              </button>
            </SheetTrigger>
            <SheetContent
              title="Ещё"
              description="Управление финансами и настройки."
              onCloseAutoFocus={(event) => {
                if (navigating.current) {
                  event.preventDefault();
                  document.getElementById('main-content')?.focus();
                  navigating.current = false;
                }
              }}
            >
              <nav aria-label="Дополнительная навигация">
                <ul className="more-navigation">
                  {moreNavigation.map((item) => (
                    <li key={item.to}>
                      <SheetClose asChild>
                        <NavLink
                          to={item.to}
                          className="nav-link"
                          onClick={() => {
                            navigating.current = true;
                          }}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
