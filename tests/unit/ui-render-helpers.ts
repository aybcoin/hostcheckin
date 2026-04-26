import { isValidElement, type ReactElement, type ReactNode } from 'react';

export function findElementByType(node: ReactNode, targetType: unknown): ReactElement | null {
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
