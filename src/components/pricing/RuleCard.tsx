import { Power, Trash2, Pencil } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { PricingRuleWithRelations } from '../../types/pricing';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { pricingRuleIcon, summarizePricingRule } from './helpers';

interface RuleCardProps {
  rule: PricingRuleWithRelations;
  currency?: string;
  onEdit: (rule: PricingRuleWithRelations) => void;
  onDelete: (rule: PricingRuleWithRelations) => void;
  onToggleActive: (rule: PricingRuleWithRelations) => void;
}

function badgeTone(ruleType: PricingRuleWithRelations['rule_type']): string {
  switch (ruleType) {
    case 'occupancy_high':
      return statusTokens.danger;
    case 'occupancy_low':
    case 'last_minute':
      return statusTokens.warning;
    case 'weekend':
    case 'date_range':
      return statusTokens.info;
    default:
      return statusTokens.neutral;
  }
}

export function RuleCard({
  rule,
  currency = 'EUR',
  onEdit,
  onDelete,
  onToggleActive,
}: RuleCardProps) {
  const Icon = pricingRuleIcon(rule.rule_type);

  return (
    <Card
      variant="default"
      padding="md"
      className={clsx('space-y-3', borderTokens.default, !rule.is_active && 'opacity-70')}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium', badgeTone(rule.rule_type))}>
              <Icon size={14} aria-hidden />
              {fr.pricingEngine.ruleType[rule.rule_type]}
            </span>
            <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-medium', statusTokens.neutral)}>
              {fr.pricingEngine.card.scope}: {rule.property_name ?? fr.pricingEngine.card.scopeAll}
            </span>
            <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-medium', statusTokens.neutral)}>
              {fr.pricingEngine.card.priorityShort}: {rule.priority}
            </span>
          </div>

          <div>
            <h3 className={clsx('text-base font-semibold', textTokens.title)}>{rule.name}</h3>
            <p className={clsx('mt-1 text-sm', textTokens.muted)}>
              {summarizePricingRule(rule, currency)}
            </p>
          </div>
        </div>

        <Button variant={rule.is_active ? 'secondary' : 'warning'} size="sm" onClick={() => onToggleActive(rule)}>
          <Power size={14} aria-hidden />
          {rule.is_active ? fr.pricingEngine.actions.deactivate : fr.pricingEngine.actions.activate}
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={clsx('text-sm', rule.is_active ? textTokens.muted : textTokens.warning)}>
          {rule.is_active ? fr.pricingEngine.card.active : fr.pricingEngine.card.inactive}
        </p>

        <div className="flex items-center gap-2">
          <Button variant="tertiary" size="sm" onClick={() => onEdit(rule)}>
            <Pencil size={14} aria-hidden />
            {fr.pricingEngine.actions.edit}
          </Button>
          <Button variant="dangerSoft" size="sm" onClick={() => onDelete(rule)}>
            <Trash2 size={14} aria-hidden />
            {fr.pricingEngine.actions.delete}
          </Button>
        </div>
      </div>
    </Card>
  );
}
