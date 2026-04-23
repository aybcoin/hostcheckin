import type { Meta, StoryObj } from '@storybook/react';
import { BadgeCheck } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const variants = ['neutral', 'success', 'active', 'locked', 'warning', 'info'] as const;

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Badge',
    variant: 'neutral',
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Badge variant="success" className="gap-1.5">
      <BadgeCheck size={12} aria-hidden="true" />
      Verified
    </Badge>
  ),
};
