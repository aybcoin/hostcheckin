import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../components/ui/Card';

const variants = ['default', 'highlight', 'danger', 'ghost', 'warning', 'info'] as const;

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    variant: 'default',
    padding: 'md',
    interactive: false,
    children: 'Card content',
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    padding: { control: 'select', options: ['sm', 'md', 'lg'] },
    interactive: { control: 'boolean' },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-3 md:grid-cols-2">
      {variants.map((variant) => (
        <Card key={variant} variant={variant}>
          <p className="text-sm font-semibold">{variant}</p>
          <p className="text-sm">Unified card token variant preview.</p>
        </Card>
      ))}
    </div>
  ),
};

export const WithContent: Story = {
  render: () => (
    <Card variant="highlight" padding="lg">
      <h3 className="text-base font-semibold">Contract overview</h3>
      <p className="mt-1 text-sm">
        This panel demonstrates title and body content inside the card component.
      </p>
    </Card>
  ),
};
