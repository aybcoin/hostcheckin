declare module '@storybook/react' {
  export interface Meta<TComponent = unknown> {
    title?: string;
    component?: TComponent;
    tags?: string[];
    args?: Record<string, unknown>;
    argTypes?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    render?: (...args: unknown[]) => unknown;
  }

  export type StoryObj<TMetaOrCmp = unknown> = {
    args?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    render?: (...args: unknown[]) => unknown;
  };
}
