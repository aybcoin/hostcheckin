import type { Meta, StoryObj } from '@storybook/react';
import { TrustBadge } from '../components/trust/TrustBadge';

const meta = {
  title: 'Trust/TrustBadge',
  component: TrustBadge,
  tags: ['autodocs'],
  args: {
    type: 'signature',
  },
  argTypes: {
    type: { control: 'select', options: ['signature', 'identity', 'deposit'] },
  },
} satisfies Meta<typeof TrustBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Signature: Story = {
  args: { type: 'signature' },
};

export const Identity: Story = {
  args: { type: 'identity' },
};

export const Deposit: Story = {
  args: { type: 'deposit' },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TrustBadge type="signature" />
      <TrustBadge type="identity" />
      <TrustBadge type="deposit" />
    </div>
  ),
};
