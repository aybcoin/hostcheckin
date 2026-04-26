import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, RefreshCw, Tags } from 'lucide-react';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  chipTokens,
  inputTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { summarizeRules } from '../lib/pricing-logic';
import { toast } from '../lib/toast';
import { usePricing } from '../hooks/usePricing';
import type { PricingOverrideWithRelations, PricingRuleType, PricingRuleWithRelations } from '../types/pricing';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { BaseRateModal } from './pricing/BaseRateModal';
import { CreateOverrideModal } from './pricing/CreateOverrideModal';
import { CreateRuleModal } from './pricing/CreateRuleModal';
import { EditRuleModal } from './pricing/EditRuleModal';
import { formatPricingMonth } from './pricing/helpers';
import { OverrideCard } from './pricing/OverrideCard';
import { PriceCalendar } from './pricing/PriceCalendar';
import { RuleCard } from './pricing/RuleCard';

interface PricingPageProps {
  hostId: string;
}

type PricingTab = 'rules' | 'overrides' | 'calendar';
type RuleTypeFilter = PricingRuleType | 'all';
type PropertyFilter = 'all' | string;
type RuleSort = 'priority_desc' | 'priority_asc' | 'newest';

function monthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchesDateRange(date: string, start: string, end: string): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'info';
}) {
  const toneClass =
    tone === 'warning'
      ? statusTokens.warning
      : tone === 'info'
        ? statusTokens.info
        : statusTokens.neutral;

  return (
    <div className={clsx('rounded-xl border px-4 py-4', toneClass)}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function PricingPage({ hostId }: PricingPageProps) {
  const {
    rules,
    overrides,
    properties,
    loading,
    error,
    refresh,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
    createOverride,
    deleteOverride,
    updatePropertyBaseRate,
    computePriceForProperty,
  } = usePricing(hostId);

  const [activeTab, setActiveTab] = useState<PricingTab>('rules');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<RuleTypeFilter>('all');
  const [rulePropertyFilter, setRulePropertyFilter] = useState<PropertyFilter>('all');
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleSort, setRuleSort] = useState<RuleSort>('priority_desc');
  const [overridePropertyFilter, setOverridePropertyFilter] = useState<PropertyFilter>('all');
  const [overrideDateFrom, setOverrideDateFrom] = useState('');
  const [overrideDateTo, setOverrideDateTo] = useState('');
  const [calendarPropertyId, setCalendarPropertyId] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRuleWithRelations | null>(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideInitialPropertyId, setOverrideInitialPropertyId] = useState<string | null>(null);
  const [overrideInitialTargetDate, setOverrideInitialTargetDate] = useState<string | null>(null);
  const [isBaseRateOpen, setIsBaseRateOpen] = useState(false);

  useEffect(() => {
    if (calendarPropertyId || properties.length === 0) return;
    const preferredProperty = properties.find((property) => property.base_nightly_rate != null) ?? properties[0];
    if (preferredProperty) {
      setCalendarPropertyId(preferredProperty.id);
    }
  }, [calendarPropertyId, properties]);

  const summary = useMemo(() => summarizeRules(rules), [rules]);
  const propertiesWithBaseRate = properties.filter((property) => property.base_nightly_rate != null).length;
  const propertiesWithoutBaseRate = properties.length - propertiesWithBaseRate;
  const propertyCurrencyMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property.pricing_currency || 'EUR'])),
    [properties],
  );
  const defaultCurrency = properties[0]?.pricing_currency || 'EUR';

  const filteredRules = useMemo(() => {
    const searchTerm = ruleSearch.trim().toLowerCase();

    const nextRules = rules
      .filter((rule) => (ruleTypeFilter === 'all' ? true : rule.rule_type === ruleTypeFilter))
      .filter((rule) => (rulePropertyFilter === 'all' ? true : rule.property_id === rulePropertyFilter))
      .filter((rule) => {
        if (!searchTerm) return true;
        const haystack = [
          rule.name,
          rule.notes,
          rule.property_name,
          fr.pricingEngine.ruleType[rule.rule_type],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTerm);
      });

    return nextRules.slice().sort((left, right) => {
      if (ruleSort === 'priority_desc') {
        return right.priority - left.priority || right.created_at.localeCompare(left.created_at);
      }
      if (ruleSort === 'priority_asc') {
        return left.priority - right.priority || right.created_at.localeCompare(left.created_at);
      }
      return right.created_at.localeCompare(left.created_at);
    });
  }, [rulePropertyFilter, ruleSearch, ruleSort, ruleTypeFilter, rules]);

  const filteredOverrides = useMemo(
    () =>
      overrides
        .filter((override) => (overridePropertyFilter === 'all' ? true : override.property_id === overridePropertyFilter))
        .filter((override) => matchesDateRange(override.target_date, overrideDateFrom, overrideDateTo))
        .slice()
        .sort((left, right) => left.target_date.localeCompare(right.target_date)),
    [overrideDateFrom, overrideDateTo, overridePropertyFilter, overrides],
  );

  const selectedCalendarProperty = properties.find((property) => property.id === calendarPropertyId) ?? null;
  const calendarComputations = useMemo(() => {
    if (!selectedCalendarProperty || selectedCalendarProperty.base_nightly_rate == null) return [];

    const range = monthRange(calendarMonth);
    const results: Array<NonNullable<ReturnType<typeof computePriceForProperty>>> = [];
    const startDate = new Date(`${range.start}T00:00:00Z`);
    const endDate = new Date(`${range.end}T00:00:00Z`);
    const cursor = new Date(startDate.getTime());

    while (cursor.getTime() <= endDate.getTime()) {
      const date = cursor.toISOString().slice(0, 10);
      const computation = computePriceForProperty(selectedCalendarProperty.id, date, { today: todayYmd() });
      if (computation) {
        results.push(computation);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return results;
  }, [calendarMonth, computePriceForProperty, selectedCalendarProperty]);

  const openOverrideModal = (propertyId?: string | null, targetDate?: string | null) => {
    setOverrideInitialPropertyId(propertyId ?? null);
    setOverrideInitialTargetDate(targetDate ?? null);
    setIsOverrideOpen(true);
  };

  const closeOverrideModal = () => {
    setIsOverrideOpen(false);
    setOverrideInitialPropertyId(null);
    setOverrideInitialTargetDate(null);
  };

  const handleCreateRule = async (input: Parameters<typeof createRule>[0]) => {
    const result = await createRule(input);
    if (result.error) {
      toast.error(fr.pricingEngine.createError);
      return { error: result.error };
    }
    toast.success(fr.pricingEngine.created);
    return { error: null };
  };

  const handleUpdateRule = async (
    id: string,
    input: Parameters<typeof updateRule>[1],
  ) => {
    const result = await updateRule(id, input);
    if (result.error) {
      toast.error(fr.pricingEngine.updateError);
      return { error: result.error };
    }
    toast.success(fr.pricingEngine.updated);
    return { error: null };
  };

  const handleDeleteRule = async (rule: PricingRuleWithRelations) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.pricingEngine.confirmDelete)) return;

    const result = await deleteRule(rule.id);
    if (result.error) {
      toast.error(fr.pricingEngine.deleteError);
      return;
    }
    toast.info(fr.pricingEngine.deleted);
  };

  const handleToggleRule = async (rule: PricingRuleWithRelations) => {
    const result = await toggleRuleActive(rule.id, !rule.is_active);
    if (result.error) {
      toast.error(fr.pricingEngine.updateError);
      return;
    }
    toast.success(fr.pricingEngine.updated);
  };

  const handleCreateOverride = async (input: Parameters<typeof createOverride>[0]) => {
    const result = await createOverride(input);
    if (result.error) {
      toast.error(fr.pricingEngine.createError);
      return { error: result.error };
    }
    toast.success(fr.pricingEngine.created);
    return { error: null };
  };

  const handleDeleteOverride = async (override: PricingOverrideWithRelations) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.pricingEngine.confirmDelete)) return;

    const result = await deleteOverride(override.id);
    if (result.error) {
      toast.error(fr.pricingEngine.deleteError);
      return;
    }
    toast.info(fr.pricingEngine.deleted);
  };

  const handleSaveBaseRate = async (
    propertyId: string,
    rate: number | null,
    currency?: string,
  ) => {
    const result = await updatePropertyBaseRate(propertyId, rate, currency);
    if (result.error) {
      toast.error(fr.pricingEngine.baseRate.error);
      return { error: result.error };
    }
    toast.success(fr.pricingEngine.baseRate.saved);
    return { error: null };
  };

  const tabButtons: Array<{ id: PricingTab; label: string }> = [
    { id: 'rules', label: fr.pricingEngine.tabs.rules },
    { id: 'overrides', label: fr.pricingEngine.tabs.overrides },
    { id: 'calendar', label: fr.pricingEngine.tabs.calendar },
  ];

  const rulesEmpty = !loading && !error && filteredRules.length === 0;
  const overridesEmpty = !loading && !error && filteredOverrides.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.pricingEngine.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.pricingEngine.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.pricingEngine.refresh}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsBaseRateOpen(true)}>
            {fr.pricingEngine.editBaseRates}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openOverrideModal()}>
            <Plus aria-hidden size={14} />
            {fr.pricingEngine.addOverride}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateRuleOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.pricingEngine.addRule}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label={fr.pricingEngine.pageTitle}>
        <SummaryCard label={fr.pricingEngine.summary.totalRules} value={summary.total} />
        <SummaryCard label={fr.pricingEngine.summary.activeRules} value={summary.active} tone="info" />
        <SummaryCard label={fr.pricingEngine.summary.totalOverrides} value={overrides.length} />
        <SummaryCard label={fr.pricingEngine.summary.withBase} value={propertiesWithBaseRate} tone="info" />
        <SummaryCard label={fr.pricingEngine.summary.withoutBase} value={propertiesWithoutBaseRate} tone="warning" />
      </section>

      <section className={clsx('space-y-3 rounded-xl border p-3', borderTokens.default, surfaceTokens.panel)}>
        <div role="tablist" aria-label={fr.pricingEngine.pageTitle} className="flex flex-wrap gap-1.5">
          {tabButtons.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.id ? chipTokens.active : chipTokens.primary,
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'rules' ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ruleTypeFilter}
              onChange={(event) => setRuleTypeFilter(event.target.value as RuleTypeFilter)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.type}
            >
              <option value="all">{fr.pricingEngine.filters.typeAll}</option>
              {Object.entries(fr.pricingEngine.ruleType).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={rulePropertyFilter}
              onChange={(event) => setRulePropertyFilter(event.target.value)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.property}
            >
              <option value="all">{fr.pricingEngine.filters.propertyAll}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <select
              value={ruleSort}
              onChange={(event) => setRuleSort(event.target.value as RuleSort)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.sortBy}
            >
              <option value="priority_desc">{fr.pricingEngine.filters.sortPriorityDesc}</option>
              <option value="priority_asc">{fr.pricingEngine.filters.sortPriorityAsc}</option>
              <option value="newest">{fr.pricingEngine.filters.sortNewest}</option>
            </select>

            <input
              type="search"
              value={ruleSearch}
              onChange={(event) => setRuleSearch(event.target.value)}
              placeholder={fr.pricingEngine.filters.searchPlaceholder}
              className={clsx(inputTokens.base, 'ml-auto w-80 max-w-full py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.searchPlaceholder}
            />
          </div>
        ) : null}

        {activeTab === 'overrides' ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={overridePropertyFilter}
              onChange={(event) => setOverridePropertyFilter(event.target.value)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.property}
            >
              <option value="all">{fr.pricingEngine.filters.propertyAll}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={overrideDateFrom}
              onChange={(event) => setOverrideDateFrom(event.target.value)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.dateFrom}
            />

            <input
              type="date"
              value={overrideDateTo}
              onChange={(event) => setOverrideDateTo(event.target.value)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.filters.dateTo}
            />
          </div>
        ) : null}

        {activeTab === 'calendar' ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={calendarPropertyId}
              onChange={(event) => setCalendarPropertyId(event.target.value)}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.calendar.selectProperty}
            >
              <option value="">{fr.pricingEngine.filters.propertyAll}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={monthInputValue(calendarMonth)}
              onChange={(event) => {
                if (!event.target.value) return;
                const [year, month] = event.target.value.split('-').map(Number);
                setCalendarMonth(new Date(year, month - 1, 1));
              }}
              className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
              aria-label={fr.pricingEngine.calendar.selectMonth}
            />

            <p className={clsx('ml-auto text-sm', textTokens.muted)}>{formatPricingMonth(calendarMonth)}</p>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {fr.pricingEngine.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={100} />
            ))}
          </div>
          <Skeleton height={360} />
        </div>
      ) : null}

      {!loading && activeTab === 'rules' ? (
        rulesEmpty ? (
          <EmptyState
            icon={<Tags size={20} />}
            title={fr.pricingEngine.empty.rules.title}
            description={fr.pricingEngine.empty.rules.description}
            action={(
              <Button variant="primary" size="sm" onClick={() => setIsCreateRuleOpen(true)}>
                <Plus aria-hidden size={14} />
                {fr.pricingEngine.addRule}
              </Button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {filteredRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                currency={rule.property_id ? propertyCurrencyMap.get(rule.property_id) : defaultCurrency}
                onEdit={setEditingRule}
                onDelete={(nextRule) => {
                  void handleDeleteRule(nextRule);
                }}
                onToggleActive={(nextRule) => {
                  void handleToggleRule(nextRule);
                }}
              />
            ))}
          </div>
        )
      ) : null}

      {!loading && activeTab === 'overrides' ? (
        overridesEmpty ? (
          <EmptyState
            icon={<CalendarDays size={20} />}
            title={fr.pricingEngine.empty.overrides.title}
            description={fr.pricingEngine.empty.overrides.description}
            action={(
              <Button variant="primary" size="sm" onClick={() => openOverrideModal()}>
                <Plus aria-hidden size={14} />
                {fr.pricingEngine.addOverride}
              </Button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {filteredOverrides.map((override) => (
              <OverrideCard
                key={override.id}
                override={override}
                currency={propertyCurrencyMap.get(override.property_id) ?? defaultCurrency}
                onDelete={(nextOverride) => {
                  void handleDeleteOverride(nextOverride);
                }}
              />
            ))}
          </div>
        )
      ) : null}

      {!loading && activeTab === 'calendar' ? (
        !selectedCalendarProperty ? (
          <EmptyState
            icon={<CalendarDays size={20} />}
            title={fr.pricingEngine.empty.calendar.title}
            description={fr.pricingEngine.empty.calendar.description}
          />
        ) : selectedCalendarProperty.base_nightly_rate == null ? (
          <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.warning)}>
            {fr.pricingEngine.calendar.missingBaseRate}
          </div>
        ) : (
          <PriceCalendar
            currentMonth={calendarMonth}
            computations={calendarComputations}
            onSelectDate={(date) => openOverrideModal(selectedCalendarProperty.id, date)}
          />
        )
      ) : null}

      <CreateRuleModal
        isOpen={isCreateRuleOpen}
        onClose={() => setIsCreateRuleOpen(false)}
        onSubmit={handleCreateRule}
        properties={properties}
      />

      <EditRuleModal
        isOpen={Boolean(editingRule)}
        rule={editingRule}
        onClose={() => setEditingRule(null)}
        onSubmit={handleUpdateRule}
        properties={properties}
      />

      <CreateOverrideModal
        isOpen={isOverrideOpen}
        properties={properties}
        overrides={overrides}
        initialPropertyId={overrideInitialPropertyId}
        initialTargetDate={overrideInitialTargetDate}
        onClose={closeOverrideModal}
        onSubmit={handleCreateOverride}
      />

      <BaseRateModal
        isOpen={isBaseRateOpen}
        properties={properties}
        onClose={() => setIsBaseRateOpen(false)}
        onSave={handleSaveBaseRate}
      />
    </div>
  );
}
