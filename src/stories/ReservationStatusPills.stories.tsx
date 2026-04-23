import type { Meta, StoryObj } from '@storybook/react';
import { ReservationStatusPills } from '../components/reservations/ReservationStatusPills';
import type { ReservationStep, StepStatus } from '../lib/reservations-status';

function makeStep(shortLabel: string, status: StepStatus, label: string): ReservationStep {
  return {
    status,
    shortLabel,
    label,
  };
}

const meta = {
  title: 'Reservations/ReservationStatusPills',
  component: ReservationStatusPills,
  tags: ['autodocs'],
} satisfies Meta<typeof ReservationStatusPills>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllOk: Story = {
  args: {
    steps: {
      checkin: makeStep('Check-in', 'ok', 'Check-in complete'),
      contrat: makeStep('Contract', 'ok', 'Contract signed'),
      identite: makeStep('ID', 'ok', 'Identity verified'),
      depot: makeStep('Deposit', 'ok', 'Deposit secured'),
    },
  },
};

export const AllBlocking: Story = {
  args: {
    steps: {
      checkin: makeStep('Check-in', 'blocking', 'Check-in overdue'),
      contrat: makeStep('Contract', 'blocking', 'Contract missing'),
      identite: makeStep('ID', 'blocking', 'Identity rejected'),
      depot: makeStep('Deposit', 'blocking', 'Deposit missing'),
    },
  },
};

export const AllPending: Story = {
  args: {
    steps: {
      checkin: makeStep('Check-in', 'pending', 'Check-in pending'),
      contrat: makeStep('Contract', 'pending', 'Contract pending'),
      identite: makeStep('ID', 'pending', 'Identity pending'),
      depot: makeStep('Deposit', 'pending', 'Deposit pending'),
    },
  },
};

export const Mixed: Story = {
  args: {
    steps: {
      checkin: makeStep('Check-in', 'ok', 'Check-in complete'),
      contrat: makeStep('Contract', 'blocking', 'Contract missing'),
      identite: makeStep('ID', 'pending', 'Identity pending'),
      depot: makeStep('Deposit', 'ok', 'Deposit secured'),
    },
  },
};
