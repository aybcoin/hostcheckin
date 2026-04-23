import { FileCheck, LifeBuoy, Lock, ShieldCheck } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const t = fr.security.page;

export function SecurityPage() {
  return (
    <div role="main" className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>
            {t.title}
          </h1>
          <Badge variant="neutral">{t.versionBadge}</Badge>
        </div>
        <p className={clsx('mt-1', textTokens.muted)}>{t.subtitle}</p>
      </div>

      {/* Grid 1-col mobile, 2-col tablet+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Section 1 — Identity */}
        <Card
          variant="default"
          padding="lg"
          aria-label={t.identitySectionAria}
        >
          <div className="flex items-start gap-4">
            <div className={clsx('shrink-0 mt-0.5', textTokens.success)}>
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={clsx('text-base font-semibold', textTokens.title)}>
                  {t.identityTitle}
                </h2>
                <Badge variant="success">{t.identityBadge}</Badge>
              </div>
              <p className={clsx('text-sm leading-relaxed', textTokens.body)}>
                {t.identityBody}
              </p>
            </div>
          </div>
        </Card>

        {/* Section 2 — Contracts */}
        <Card
          variant="default"
          padding="lg"
          aria-label={t.contractSectionAria}
        >
          <div className="flex items-start gap-4">
            <div className={clsx('shrink-0 mt-0.5', textTokens.success)}>
              <FileCheck size={24} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={clsx('text-base font-semibold', textTokens.title)}>
                  {t.contractTitle}
                </h2>
                <Badge variant="success">{t.contractBadge}</Badge>
              </div>
              <p className={clsx('text-sm leading-relaxed', textTokens.body)}>
                {t.contractBody}
              </p>
            </div>
          </div>
        </Card>

        {/* Section 3 — Data */}
        <Card
          variant="default"
          padding="lg"
          aria-label={t.dataSectionAria}
        >
          <div className="flex items-start gap-4">
            <div className={clsx('shrink-0 mt-0.5', textTokens.muted)}>
              <Lock size={24} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={clsx('text-base font-semibold', textTokens.title)}>
                  {t.dataTitle}
                </h2>
                <Badge variant="neutral">{t.dataBadge}</Badge>
              </div>
              <p className={clsx('text-sm leading-relaxed', textTokens.body)}>
                {t.dataBody}
              </p>
            </div>
          </div>
        </Card>

        {/* Section 4 — Support */}
        <Card
          variant="default"
          padding="lg"
          aria-label={t.supportSectionAria}
        >
          <div className="flex items-start gap-4">
            <div className={clsx('shrink-0 mt-0.5', textTokens.info)}>
              <LifeBuoy size={24} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-3">
              <h2 className={clsx('text-base font-semibold', textTokens.title)}>
                {t.supportTitle}
              </h2>
              <p className={clsx('text-sm leading-relaxed', textTokens.body)}>
                {t.supportBody}
              </p>
              <Button
                variant="secondary"
                onClick={() => window.open('mailto:support@hostcheckin.com')}
              >
                {t.supportCta}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
