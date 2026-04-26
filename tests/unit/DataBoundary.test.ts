import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataBoundary } from '../../src/components/ui/DataBoundary';
import { fr } from '../../src/lib/i18n/fr';

describe('DataBoundary', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    errorSpy.mockClear();
  });

  it('renders the default loading fallback', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        { loading: true, error: null },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(html).toContain('animate-pulse');
  });

  it('renders a custom loading fallback', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        {
          loading: true,
          error: null,
          loadingFallback: createElement('div', null, 'Chargement custom'),
        },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(html).toContain('Chargement custom');
  });

  it('renders the default error fallback with business copy only', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        {
          loading: false,
          error: new Error('Top secret failure'),
          errorDescription: fr.errors.portfolioUnavailable,
        },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(html).toContain(fr.errors.genericTitle);
    expect(html).toContain(fr.errors.portfolioUnavailable);
    expect(html).not.toContain('Top secret failure');
  });

  it('renders a custom error fallback when provided', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        {
          loading: false,
          error: new Error('Failure'),
          errorFallback: createElement('div', null, 'Erreur custom'),
        },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(html).toContain('Erreur custom');
  });

  it('renders the empty fallback when empty', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        {
          loading: false,
          error: null,
          isEmpty: true,
          emptyFallback: createElement('div', null, 'Aucun résultat'),
        },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(html).toContain('Aucun résultat');
  });

  it('renders children when empty but no empty fallback is supplied', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        { loading: false, error: null, isEmpty: true },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(html).toContain('Contenu');
  });

  it('renders children on the success path', () => {
    const html = renderToStaticMarkup(
      createElement(
        DataBoundary,
        { loading: false, error: null },
        createElement('div', null, 'Succès'),
      ),
    );

    expect(html).toContain('Succès');
  });

  it('logs the error through ErrorState when the default error fallback is used', () => {
    const error = new Error('Server down');
    renderToStaticMarkup(
      createElement(
        DataBoundary,
        { loading: false, error },
        createElement('div', null, 'Contenu'),
      ),
    );

    expect(errorSpy).toHaveBeenCalledWith('[ErrorState]', error);
  });
});
