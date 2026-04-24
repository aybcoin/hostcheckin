import { useState } from 'react';
import {
  completeOnboarding,
  getOnboardingState,
  type OnboardingState,
  type OnboardingStep,
  setOnboardingStep,
} from '../lib/onboarding';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(getOnboardingState);

  return {
    state,
    isComplete: state.completed,
    currentStep: state.currentStep,
    goToStep: (step: OnboardingStep) => {
      setOnboardingStep(step);
      setState(getOnboardingState());
    },
    complete: () => {
      completeOnboarding();
      setState(getOnboardingState());
    },
    skip: () => {
      completeOnboarding();
      setState(getOnboardingState());
    },
  };
}
