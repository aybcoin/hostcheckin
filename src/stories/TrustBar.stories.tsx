import type { Meta, StoryObj } from '@storybook/react';
import { TrustBar } from '../components/trust/TrustBar';
import type { TrustMetrics } from '../lib/trust-metrics';

const baseMetrics: TrustMetrics = {
  signatures: 12,
  identities: 8,
  deposits: 5,
  windowDays: 30,
};

const meta = {
  title: 'Trust/TrustBar',
  component: TrustBar,
  tags: ['autodocs'],
  args: {
    metrics: baseMetrics,
  },
} satisfies Meta<typeof TrustBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rich: Story = {};

export const Empty: Story = {
  args: {
    metrics: {
      signatures: 0,
      identities: 0,
      deposits: 0,
      windowDays: 30,
    },
  },
};

export const SingleMetric: Story = {
  args: {
    metrics: {
      signatures: 9,
      identities: 4,
      deposits: 0,
      windowDays: 30,
    },
  },
};
