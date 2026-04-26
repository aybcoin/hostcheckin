import type { Meta, StoryObj } from '@storybook/react';
import { PnLBarChart } from '../components/finance/PnLBarChart';

const fullYear = [
  { month: '2025-05', revenue: 2100, expenses: 800 },
  { month: '2025-06', revenue: 2850, expenses: 1100 },
  { month: '2025-07', revenue: 4200, expenses: 1300 },
  { month: '2025-08', revenue: 4600, expenses: 1450 },
  { month: '2025-09', revenue: 3100, expenses: 980 },
  { month: '2025-10', revenue: 1800, expenses: 720 },
  { month: '2025-11', revenue: 1500, expenses: 650 },
  { month: '2025-12', revenue: 2400, expenses: 920 },
  { month: '2026-01', revenue: 1700, expenses: 1100 },
  { month: '2026-02', revenue: 2200, expenses: 750 },
  { month: '2026-03', revenue: 3400, expenses: 1280 },
  { month: '2026-04', revenue: 4100, expenses: 1370 },
];

const meta = {
  title: 'Finance/PnLBarChart',
  component: PnLBarChart,
  tags: ['autodocs'],
  args: { data: fullYear, height: 220 },
  argTypes: {
    height: { control: { type: 'number', min: 100, max: 480, step: 10 } },
  },
} satisfies Meta<typeof PnLBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwelveMonths: Story = {};

export const ThreeMonths: Story = {
  args: { data: fullYear.slice(-3) },
};

export const Empty: Story = {
  args: { data: [] },
};

export const Loss: Story = {
  args: {
    data: [
      { month: '2026-01', revenue: 800, expenses: 1500 },
      { month: '2026-02', revenue: 950, expenses: 1700 },
      { month: '2026-03', revenue: 1100, expenses: 1850 },
    ],
  },
};
