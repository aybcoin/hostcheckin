import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle, Inbox, Shield } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    icon: <Inbox size={20} aria-hidden="true" />,
    title: 'No items found',
    description: 'You can add your first item to get started.',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {
  args: {
    action: <Button variant="primary">Create item</Button>,
  },
};

export const WithoutAction: Story = {};

export const CustomIcon: Story = {
  args: {
    icon: <Shield size={20} aria-hidden="true" />,
    title: 'Secure by design',
    description: 'Identity checks and signed contracts appear here.',
    action: (
      <Button variant="secondary">
        <AlertCircle size={14} aria-hidden="true" />
        Learn more
      </Button>
    ),
  },
};
