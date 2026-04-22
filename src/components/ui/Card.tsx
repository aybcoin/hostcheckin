import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cardTokens } from '../../lib/design-tokens';
import { clsx } from '../../lib/clsx';

type CardVariant = 'default' | 'highlight' | 'danger' | 'warning' | 'info' | 'ghost';
type CardPadding = 'sm' | 'md' | 'lg';

type CardProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  /**
   * `default`: surface principale neutre.
   * `highlight`: même surface avec ombre douce pour attirer l'attention.
   * `danger`: surface d'alerte critique, rouge léger.
   * `warning`: surface d'attention non bloquante.
   * `info`: surface informative (contextuelle / guidance).
   * `ghost`: surface secondaire neutre pour blocs contextuels.
   */
  variant?: CardVariant;
  /** `sm` pour cartes compactes, `md` pour usage standard, `lg` pour sections éditoriales. */
  padding?: CardPadding;
  /** Active un comportement visuel interactif (hover/focus). */
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children'>;

export function Card<T extends ElementType = 'section'>({
  as,
  children,
  className,
  variant = 'default',
  padding = 'md',
  interactive = false,
  ...props
}: CardProps<T>) {
  const Component = (as || 'section') as ElementType;
  return (
    <Component
      className={clsx(
        cardTokens.base,
        cardTokens.variants[variant],
        cardTokens.padding[padding],
        interactive && cardTokens.interactive,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
