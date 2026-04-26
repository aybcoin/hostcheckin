import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/components/ui/Button';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { fr } from '../../src/lib/i18n/fr';
import { findElementByType } from './ui-render-helpers';

describe('ErrorState', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    errorSpy.mockClear();
  });

  it('renders the default content', () => {
    const html = renderToStaticMarkup(createElement(ErrorState));

    expect(html).toContain(fr.errors.genericTitle);
    expect(html).toContain(fr.errors.genericDescription);
  });

  it('renders a custom title and description', () => {
    const html = renderToStaticMarkup(
      createElement(ErrorState, {
        title: 'Titre custom',
        description: 'Description custom',
      }),
    );

    expect(html).toContain('Titre custom');
    expect(html).toContain('Description custom');
  });

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn();
    const tree = ErrorState({ onRetry });
    const buttonElement = findElementByType(tree, Button);

    expect(buttonElement).not.toBeNull();
    (buttonElement?.props as { onClick?: () => void }).onClick?.();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the support link when provided', () => {
    const html = renderToStaticMarkup(
      createElement(ErrorState, { supportHref: 'mailto:support@example.com' }),
    );

    expect(html).toContain('href="mailto:support@example.com"');
    expect(html).toContain(fr.errors.contactSupport);
  });

  it('logs the provided error', () => {
    const error = new Error('Hidden stack');
    renderToStaticMarkup(createElement(ErrorState, { error }));

    expect(errorSpy).toHaveBeenCalledWith('[ErrorState]', error);
  });

  it('never leaks the raw error message to the DOM', () => {
    const html = renderToStaticMarkup(
      createElement(ErrorState, { error: new Error('Sensitive database error') }),
    );

    expect(html).not.toContain('Sensitive database error');
  });
});
