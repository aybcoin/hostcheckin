import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from '../../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneMode());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstalled(isStandaloneMode());
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => {
      setIsInstalled(isStandaloneMode());
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onDisplayModeChange);
      }
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className={clsx('rounded-lg border p-3', borderTokens.default, surfaceTokens.subtle)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={clsx('text-sm', textTokens.body)}>
          Installez HostCheckIn pour un accès rapide depuis votre écran d&apos;accueil.
        </p>
        <Button variant="secondary" size="sm" onClick={() => { void handleInstall(); }}>
          <Download size={16} aria-hidden="true" />
          Installer l&apos;application
        </Button>
      </div>
    </div>
  );
}
