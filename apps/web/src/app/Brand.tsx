import { Link } from 'react-router';

export function Brand() {
  return (
    <Link to="/" aria-label="Finora — обзор" className="brand">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6 19V5h13M6 12h10" stroke="currentColor" strokeWidth="3" />
          <path d="m13 19 6-7" stroke="currentColor" strokeWidth="3" />
        </svg>
      </span>
      <span>Finora</span>
    </Link>
  );
}
