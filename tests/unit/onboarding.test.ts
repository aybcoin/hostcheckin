import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeOnboarding,
  getOnboardingState,
  isOnboardingComplete,
  resetOnboarding,
  setOnboardingStep,
} from '../../src/lib/onboarding';

describe('onboarding state helpers', () => {
  beforeEach(() => {
    resetOnboarding();
  });

  it('retourne l’état initial par défaut', () => {
    const state = getOnboardingState();

    expect(state.completed).toBe(false);
    expect(state.currentStep).toBe('welcome');
    expect(state.steps).toHaveLength(3);
    expect(state.steps.every((step) => !step.completed)).toBe(true);
  });

  it('met à jour le step vers property', () => {
    setOnboardingStep('property');

    const state = getOnboardingState();
    expect(state.currentStep).toBe('property');
    expect(state.steps.find((step) => step.id === 'welcome')?.completed).toBe(true);
    expect(state.steps.find((step) => step.id === 'property')?.completed).toBe(false);
  });

  it('met à jour le step vers notifications', () => {
    setOnboardingStep('notifications');

    const state = getOnboardingState();
    expect(state.currentStep).toBe('notifications');
    expect(state.steps.find((step) => step.id === 'welcome')?.completed).toBe(true);
    expect(state.steps.find((step) => step.id === 'property')?.completed).toBe(true);
  });

  it('setOnboardingStep(done) marque le parcours comme complété', () => {
    setOnboardingStep('done');

    const state = getOnboardingState();
    expect(state.completed).toBe(true);
    expect(state.currentStep).toBe('done');
    expect(state.steps.every((step) => step.completed)).toBe(true);
  });

  it('completeOnboarding marque completed à true', () => {
    completeOnboarding();

    const state = getOnboardingState();
    expect(state.completed).toBe(true);
    expect(state.currentStep).toBe('done');
  });

  it('isOnboardingComplete retourne false par défaut', () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it('isOnboardingComplete retourne true après complétion', () => {
    completeOnboarding();
    expect(isOnboardingComplete()).toBe(true);
  });

  it('resetOnboarding remet l’état à zéro', () => {
    completeOnboarding();
    resetOnboarding();

    const state = getOnboardingState();
    expect(state.completed).toBe(false);
    expect(state.currentStep).toBe('welcome');
  });

  it('ignore les changements de step une fois complété', () => {
    completeOnboarding();
    setOnboardingStep('property');

    const state = getOnboardingState();
    expect(state.completed).toBe(true);
    expect(state.currentStep).toBe('done');
  });
});
