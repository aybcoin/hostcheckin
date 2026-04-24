import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ErrorFallback } from '../../src/components/ui/ErrorBoundary';
import { Button } from '../../src/components/ui/Button';

function findElementByType(node: ReactNode, targetType: unknown): ReactElement | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByType(child, targetType);
      if (found) return found;
    }
    return null;
  }

  if (!isValidElement(node)) {
    return null;
  }

  if (node.type === targetType) {
    return node as ReactElement;
  }

  const children = (node.props as { children?: ReactNode }).children;
  return findElementByType(children, targetType);
}

describe('ErrorFallback', () => {
  it('renders fallback content and technical message', () => {
    const html = renderToStaticMarkup(ErrorFallback({ error: new Error('Boom dashboard') }));
    expect(html).toContain('Une erreur est survenue');
    expect(html).toContain('Boom dashboard');
    expect(html).toContain('Recharger la page');
  });

  it('reloads the page when clicking the action button', () => {
    const reloadSpy = vi.fn();
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window: { location: { reload: () => void } } }).window = {
      location: { reload: reloadSpy },
    };

    const tree = ErrorFallback({ error: new Error('Crash') });
    const buttonElement = findElementByType(tree, Button);
    expect(buttonElement).not.toBeNull();
    (buttonElement?.props as { onClick?: () => void }).onClick?.();

    expect(reloadSpy).toHaveBeenCalledTimes(1);

    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });
});
