export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

function toClassString(value: ClassValue): string {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toClassString).filter(Boolean).join(' ');
  }

  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className)
    .join(' ');
}

export function clsx(...values: ClassValue[]): string {
  return values
    .map(toClassString)
    .filter(Boolean)
    .join(' ');
}
