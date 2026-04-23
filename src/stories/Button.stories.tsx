import type { Meta, StoryObj } from '@storybook/react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

const variants = ['primary', 'secondary', 'tertiary', 'danger', 'subtle', 'warning', 'dangerSoft'] as const;
const sizes = ['sm', 'md'] as const;

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Continue',
    variant: 'primary',
    size: 'md',
    disabled: false,
    fullWidth: false,
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'select', options: sizes },
    children: { control: 'text' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {variants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <Button variant="secondary" size="sm" aria-label="Confirm">
      <Check size={16} aria-hidden="true" />
    </Button>
  ),
};

export const Loading: Story = {
  render: () => (
    <Button variant="primary" disabled>
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      Loading
    </Button>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className="w-80">
      <Button variant="primary" fullWidth>
        Continue
      </Button>
    </div>
  ),
};
