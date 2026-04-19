import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cardTokens } from '../../lib/design-tokens';

type CardVariant = 'default' | 'highlight' | 'danger' | 'ghost';
type CardPadding = 'sm' | 'md' | 'lg';

type CardProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  /**
   * `default`: surface principale neutre.
   * `highlight`: même surface avec ombre douce pour attirer l'attention.
   * `danger`: surface d'alerte critique, rouge léger.
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
      className={`
        ${cardTokens.base}
        ${cardTokens.variants[variant]}
        ${cardTokens.padding[padding]}
        ${interactive ? cardTokens.interactive : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </Component>
  );
}
