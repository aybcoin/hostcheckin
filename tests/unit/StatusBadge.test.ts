import { Check } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../../src/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['success', 'border-emerald-200'],
    ['warning', 'border-amber-200'],
    ['danger', 'border-red-200'],
    ['neutral', 'border-stone-200'],
    ['info', 'border-sky-200'],
  ] as const)('renders the %s variant', (variant, className) => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { variant }, 'Statut'));
    expect(html).toContain(className);
  });

  it('uses the small size by default', () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { variant: 'neutral' }, 'Normal'));
    expect(html).toContain('px-2');
    expect(html).toContain('py-0.5');
    expect(html).toContain('text-xs');
  });

  it('renders the medium size when requested', () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { variant: 'info', size: 'md' }, 'Info'));
    expect(html).toContain('px-2.5');
    expect(html).toContain('py-1');
    expect(html).toContain('text-sm');
  });

  it('resizes lucide icons automatically', () => {
    const html = renderToStaticMarkup(
      createElement(
        StatusBadge,
        { variant: 'success', icon: createElement(Check, { 'data-testid': 'status-icon' }) },
        'Validé',
      ),
    );

    expect(html).toContain('data-testid="status-icon"');
    expect(html).toContain('width="12"');
    expect(html).toContain('height="12"');
  });

  it('merges the custom className', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBadge, { variant: 'danger', className: 'uppercase' }, 'Alerte'),
    );

    expect(html).toContain('uppercase');
  });
});
