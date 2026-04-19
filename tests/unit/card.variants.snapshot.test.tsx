import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../../src/components/ui/Card';

describe('Card variants', () => {
  const sortedClassList = (element: HTMLElement) => Array.from(element.classList).sort();

  it('snapshot default', () => {
    const { container } = render(<Card>Contenu</Card>);
    expect(sortedClassList(container.firstChild as HTMLElement)).toMatchInlineSnapshot(`
      [
        "bg-white",
        "border",
        "border-slate-200",
        "p-5",
        "rounded-xl",
      ]
    `);
  });

  it('snapshot highlight', () => {
    const { container } = render(<Card variant="highlight">Contenu</Card>);
    expect(sortedClassList(container.firstChild as HTMLElement)).toMatchInlineSnapshot(`
      [
        "bg-white",
        "border",
        "border-slate-200",
        "p-5",
        "rounded-xl",
        "shadow-sm",
      ]
    `);
  });

  it('snapshot danger', () => {
    const { container } = render(<Card variant="danger">Contenu</Card>);
    expect(sortedClassList(container.firstChild as HTMLElement)).toMatchInlineSnapshot(`
      [
        "bg-red-50",
        "border",
        "border-red-200",
        "border-slate-200",
        "p-5",
        "rounded-xl",
      ]
    `);
  });

  it('snapshot ghost', () => {
    const { container } = render(<Card variant="ghost">Contenu</Card>);
    expect(sortedClassList(container.firstChild as HTMLElement)).toMatchInlineSnapshot(`
      [
        "bg-slate-50",
        "border",
        "border-slate-200",
        "p-5",
        "rounded-xl",
      ]
    `);
  });

  it('snapshot interactive + padding', () => {
    const { container } = render(
      <Card variant="default" padding="lg" interactive>
        Contenu
      </Card>,
    );
    expect(sortedClassList(container.firstChild as HTMLElement)).toMatchInlineSnapshot(`
      [
        "bg-white",
        "border",
        "border-slate-200",
        "duration-200",
        "focus-within:ring-2",
        "focus-within:ring-slate-300",
        "hover:shadow-sm",
        "p-6",
        "rounded-xl",
        "transition-shadow",
      ]
    `);
  });
});
