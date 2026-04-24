import type { CSSProperties } from 'react';
import { clsx } from '../../lib/clsx';
import { borderTokens } from '../../lib/design-tokens';

type SkeletonVariant = 'text' | 'rect' | 'circle';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  variant?: SkeletonVariant;
}

const shapeClassByVariant: Record<SkeletonVariant, string> = {
  text: 'rounded-md',
  rect: 'rounded-lg',
  circle: 'rounded-full',
};

const subtleBgToken = borderTokens.subtle.replace('border-', 'bg-');

export function Skeleton({
  width,
  height,
  className,
  variant = 'rect',
}: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;

  return (
    <div
      aria-hidden="true"
      style={style}
      className={clsx('animate-pulse', subtleBgToken, shapeClassByVariant[variant], className)}
    />
  );
}
