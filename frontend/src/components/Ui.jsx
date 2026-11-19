import { LoaderCircle } from 'lucide-react';

export function LoadingScreen({ label = 'Loading...' }) {
  return (
    <div className="loading-screen" role="status">
      <LoaderCircle className="spin" size={23} />
      <span>{label}</span>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <div className="loading-block" role="status">
      <LoaderCircle className="spin" size={19} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-state" role="alert">
      <strong>We couldn’t load this data</strong>
      <span>{message}</span>
      {onRetry && <button className="button button-secondary button-small" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state-card empty-state">
      <div className="empty-mark">—</div>
      <strong>{title}</strong>
      <span>{message}</span>
      {action}
    </div>
  );
}

export function TicketStatus({ status }) {
  const className = status?.toLowerCase().replaceAll('_', '-') || 'unknown';
  return <span className={`status-pill status-${className}`}>{status?.replaceAll('_', ' ') || 'Unknown'}</span>;
}

export function PriorityTag({ priority }) {
  return <span className={`priority-tag priority-${priority?.toLowerCase()}`}>{priority}</span>;
}

export function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div className="form-error" role="alert">
      <strong>{error.message}</strong>
      {error.errors?.length > 0 && (
        <ul>{error.errors.map((item, index) => <li key={`${item.path || 'error'}-${index}`}>
          {item.path ? `${item.path}: ` : ''}{item.message || item}
        </li>)}</ul>
      )}
    </div>
  );
}
