import { BarChart3 } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Card } from '../../src/components/ui/Card';
import { KpiCard } from '../../src/components/ui/KpiCard';
import { findElementByType } from './ui-render-helpers';

describe('KpiCard', () => {
  it('renders the label and value', () => {
    const html = renderToStaticMarkup(createElement(KpiCard, { label: 'Revenus', value: '12 000 €' }));

    expect(html).toContain('Revenus');
    expect(html).toContain('12 000 €');
  });

  it('renders the icon when provided', () => {
    const html = renderToStaticMarkup(
      createElement(KpiCard, {
        label: 'Analytics',
        value: '42',
        icon: createElement(BarChart3, { 'data-testid': 'kpi-icon' }),
      }),
    );

    expect(html).toContain('data-testid="kpi-icon"');
  });

  it('renders the accent variant', () => {
    const html = renderToStaticMarkup(createElement(KpiCard, { label: 'Actif', value: '3', variant: 'accent' }));

    expect(html).toContain('bg-emerald-50');
    expect(html).toContain('border-emerald-200');
  });

  it('renders an upward trend badge', () => {
    const html = renderToStaticMarkup(
      createElement(KpiCard, {
        label: 'Croissance',
        value: '18%',
        trend: { delta: 2, pctChange: 18.4, trend: 'up' },
      }),
    );

    expect(html).toContain('+18,4%');
  });

  it('renders a flat trend badge when pctChange is null', () => {
    const html = renderToStaticMarkup(
      createElement(KpiCard, {
        label: 'Stable',
        value: '9',
        trend: { delta: 0, pctChange: null, trend: 'flat' },
      }),
    );

    expect(html).toContain('>0<');
  });

  it('passes the click handler through the interactive card wrapper', () => {
    const onClick = vi.fn();
    const tree = KpiCard({ label: 'Ouvert', value: '5', onClick });
    const cardElement = findElementByType(tree, Card);

    expect(cardElement).not.toBeNull();
    expect((cardElement?.props as { as?: string }).as).toBe('button');
    (cardElement?.props as { onClick?: () => void }).onClick?.();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('passes the href through the interactive card wrapper', () => {
    const tree = KpiCard({ label: 'Réservations', value: '12', href: '/reservations' });
    const cardElement = findElementByType(tree, Card);

    expect(cardElement).not.toBeNull();
    expect((cardElement?.props as { as?: string }).as).toBe('a');
    expect((cardElement?.props as { href?: string }).href).toBe('/reservations');
  });
});
