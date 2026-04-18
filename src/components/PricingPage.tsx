import { useEffect, useState } from 'react';
import { PricingToggle } from './pricing/PricingToggle';
import { PricingCard } from './pricing/PricingCard';

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
    positioning: 'Idéal pour démarrer avec une ou deux propriétés.',
    features: [
      'Jusqu’à 2 propriétés actives',
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
      'Jusqu’à 10 propriétés actives',
      'Liens automatiques par propriété',
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
      'Propriétés illimitées',
      'Workflow vérification complète',
      'Blacklist invités et alertes avancées',
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Abonnement</h1>
        <p className="text-sm sm:text-base text-slate-600">
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

      <footer className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600">
        14 jours d’essai gratuit · Aucune carte requise · Annulation à tout moment
      </footer>
    </div>
  );
}
