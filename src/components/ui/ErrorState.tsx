import { AlertTriangle } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  ctaTokens,
  stateFillTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  supportHref?: string;
  className?: string;
}

export function ErrorState({
  title = fr.errors.genericTitle,
  description = fr.errors.genericDescription,
  error,
  onRetry,
  supportHref,
  className,
}: ErrorStateProps) {
  if (error !== undefined && error !== null) {
    console.error('[ErrorState]', error);
  }

  return (
    <Card
      variant="default"
      padding="lg"
      role="alert"
      className={clsx('space-y-4 text-center', className)}
    >
      <div
        className={clsx(
          'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
          stateFillTokens.danger,
          textTokens.danger,
        )}
      >
        <AlertTriangle size={20} aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <h3 className={clsx('text-base font-semibold', textTokens.title)}>{title}</h3>
        <p className={clsx('text-sm', textTokens.muted)}>{description}</p>
      </div>

      {onRetry || supportHref ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              {fr.errors.retry}
            </Button>
          ) : null}
          {supportHref ? (
            <a
              href={supportHref}
              className={clsx(
                'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium',
                ctaTokens.secondary,
              )}
            >
              {fr.errors.contactSupport}
            </a>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
