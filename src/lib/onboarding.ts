export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  steps: OnboardingStepConfig[];
}

export type OnboardingStep = 'welcome' | 'property' | 'notifications' | 'done';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  completed: boolean;
}

const STORAGE_KEY = 'hc_onboarding_v1';

const STEP_ORDER: Array<Exclude<OnboardingStep, 'done'>> = ['welcome', 'property', 'notifications'];

const STEP_CONTENT: Record<Exclude<OnboardingStep, 'done'>, Pick<OnboardingStepConfig, 'title' | 'description'>> = {
  welcome: {
    title: 'Bienvenue',
    description: 'Découvrir HostCheckIn et ses bénéfices.',
  },
  property: {
    title: 'Propriété',
    description: 'Créer votre premier logement.',
  },
  notifications: {
    title: 'Notifications',
    description: 'Activer les rappels automatiques.',
  },
};

let memoryStorageValue: string | null = null;

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorage(): string | null {
  if (canUseBrowserStorage()) {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  return memoryStorageValue;
}

function writeStorage(value: string): void {
  if (canUseBrowserStorage()) {
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  memoryStorageValue = value;
}

function removeStorage(): void {
  if (canUseBrowserStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  memoryStorageValue = null;
}

function isValidStep(step: unknown): step is OnboardingStep {
  return step === 'welcome' || step === 'property' || step === 'notifications' || step === 'done';
}

function createSteps(currentStep: OnboardingStep, completed: boolean): OnboardingStepConfig[] {
  if (completed || currentStep === 'done') {
    return STEP_ORDER.map((stepId) => ({
      id: stepId,
      title: STEP_CONTENT[stepId].title,
      description: STEP_CONTENT[stepId].description,
      completed: true,
    }));
  }

  const currentIndex = STEP_ORDER.indexOf(currentStep as Exclude<OnboardingStep, 'done'>);

  return STEP_ORDER.map((stepId, index) => ({
    id: stepId,
    title: STEP_CONTENT[stepId].title,
    description: STEP_CONTENT[stepId].description,
    completed: currentIndex > index,
  }));
}

function createState(currentStep: OnboardingStep, completed: boolean): OnboardingState {
  const normalizedCompleted = completed || currentStep === 'done';
  const normalizedStep = normalizedCompleted ? 'done' : currentStep;

  return {
    completed: normalizedCompleted,
    currentStep: normalizedStep,
    steps: createSteps(normalizedStep, normalizedCompleted),
  };
}

function initialState(): OnboardingState {
  return createState('welcome', false);
}

function persistState(state: Pick<OnboardingState, 'completed' | 'currentStep'>): void {
  writeStorage(JSON.stringify(state));
}

export function getOnboardingState(): OnboardingState {
  const rawValue = readStorage();

  if (!rawValue) {
    return initialState();
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<Pick<OnboardingState, 'completed' | 'currentStep'>>;
    const nextCompleted = Boolean(parsed.completed);
    const nextStep = isValidStep(parsed.currentStep)
      ? parsed.currentStep
      : nextCompleted
        ? 'done'
        : 'welcome';

    return createState(nextStep, nextCompleted);
  } catch {
    return initialState();
  }
}

export function setOnboardingStep(step: OnboardingStep): void {
  const current = getOnboardingState();

  if (current.completed) {
    persistState({ completed: true, currentStep: 'done' });
    return;
  }

  persistState({
    completed: step === 'done',
    currentStep: step,
  });
}

export function completeOnboarding(): void {
  persistState({ completed: true, currentStep: 'done' });
}

export function isOnboardingComplete(): boolean {
  return getOnboardingState().completed;
}

export function resetOnboarding(): void {
  removeStorage();
}
