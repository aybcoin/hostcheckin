import { useEffect, useState } from 'react';
import { clsx } from '../lib/clsx';
import { textTokens } from '../lib/design-tokens';
import { PricingToggle } from './pricing/PricingToggle';
import { PricingCard } from './pricing/PricingCard';
import { Card } from './ui/Card';

interface PricingPlan {
  name: string;
  monthly: number;
  yearly: number;
  positioning: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    monthly: 99,
    yearly: 950,
    positioning: 'Idéal pour démarrer avec un ou deux logements.',
    features: [
      'Jusqu’à 2 logements actifs',
      'Check-in digital et vérification identité',
      'Contrat PDF signé électroniquement',
      'Calendrier consolidé des arrivées',
      'Support e-mail',
    ],
  },
  {
    name: 'Pro',
    monthly: 199,
    yearly: 1910,
    positioning: 'Le meilleur équilibre pour les hôtes en croissance.',
    features: [
      'Jusqu’à 10 logements actifs',
      'Liens automatiques par logement',
      'QR code et affiche imprimable',
      'Templates de messages multilingues',
      'Tableau de bord avancé',
      'Support prioritaire WhatsApp',
    ],
    recommended: true,
  },
  {
    name: 'Business',
    monthly: 399,
    yearly: 3830,
    positioning: 'Conçu pour les équipes et la gestion multi-collaborateurs.',
    features: [
      'Logements illimités',
      'Workflow vérification complète',
      'Voyageurs bloqués et alertes avancées',
      'Journal d’audit renforcé',
      'Accès équipe et rôles',
      'Accompagnement de déploiement',
    ],
  },
] as const;

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const titleBefore = document.title;
    document.title = 'Abonnement | HostCheckIn';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMeta?.getAttribute('content') || '';
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'Découvrez les offres HostCheckIn pour digitaliser vos check-ins et contrats en toute conformité.',
      );
    }

    return () => {
      document.title = titleBefore;
      if (descriptionMeta) {
        descriptionMeta.setAttribute('content', previousDescription);
      }
    };
  }, []);

  return (
    <div className="space-y-7">
      <header className="space-y-3">
        <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>Abonnement</h1>
        <p className={clsx('text-sm sm:text-base', textTokens.muted)}>
          Choisissez l’offre adaptée à votre activité, avec une expérience premium et sans engagement.
        </p>
      </header>

      <div>
        <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.name}
            name={plan.name}
            priceMonthly={plan.monthly}
            priceYearly={plan.yearly}
            currency="MAD"
            positioning={plan.positioning}
            features={[...plan.features]}
            billingCycle={billingCycle}
            recommended={plan.recommended}
          />
        ))}
      </div>

      <Card as="footer" variant="default" padding="sm" className={clsx('text-center text-sm', textTokens.muted)}>
        14 jours d’essai gratuit · Aucune carte requise · Annulation à tout moment
      </Card>
    </div>
  );
}
