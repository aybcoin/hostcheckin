import type { Meta, StoryObj } from '@storybook/react';
import { KpiCard } from '../components/finance/KpiCard';

const tones = ['neutral', 'success', 'danger', 'warning'] as const;

const meta = {
  title: 'Finance/KpiCard',
  component: KpiCard,
  tags: ['autodocs'],
  args: {
    label: 'Revenus',
    value: '4 250,00 €',
    tone: 'neutral',
    helper: 'Mois en cours',
  },
  argTypes: {
    tone: { control: 'select', options: tones },
    helper: { control: 'text' },
  },
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = { args: { tone: 'success', label: 'Marge', value: '+ 1 820,00 €' } };

export const Danger: Story = { args: { tone: 'danger', label: 'Pertes', value: '− 320,00 €' } };

export const Warning: Story = { args: { tone: 'warning', label: 'Stock bas', value: '3' } };

export const AllTones: Story = {
  render: () => (
    <div className="grid gap-3 md:grid-cols-4">
      {tones.map((tone) => (
        <KpiCard
          key={tone}
          label={tone.charAt(0).toUpperCase() + tone.slice(1)}
          value="1 234,56 €"
          tone={tone}
          helper="Aperçu"
        />
      ))}
    </div>
  ),
};
