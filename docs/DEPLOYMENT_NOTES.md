# Notes de déploiement — Sprint Lot 2/3

## Variables d’environnement à ajouter

### Frontend (Vercel / runtime client)
- `VITE_SUPPORT_WHATSAPP` (ou `NEXT_PUBLIC_SUPPORT_WHATSAPP`)  
  Format recommandé: numéro international sans espaces, ex. `212600000000`
- `VITE_SUPPORT_EMAIL` (ou `NEXT_PUBLIC_SUPPORT_EMAIL`)
- `VITE_APP_URL`
- `VITE_PUBLIC_BOOKING_CSRF_TOKEN` (recommandé si CSRF activé côté fonction)

### Supabase Edge Function `public-booking`
- `PUBLIC_BOOKING_ALLOWED_ORIGINS`  
  Liste CSV d’origines autorisées, ex.  
  `https://hostcheckin.vercel.app,https://www.hostcheckin.vercel.app`
- `HCAPTCHA_SECRET`  
  Requis pour valider les tentatives après seuil anti-abus.
- `PUBLIC_BOOKING_CSRF_TOKEN` (optionnel mais recommandé)  
  Si défini, le client doit envoyer `X-Public-Booking-Csrf` sur les requêtes `POST`.

## Migrations à exécuter

Exécuter la migration:
- `supabase/migrations/20260418170000_add_auto_link_blacklist_and_verification_mode.sql`

Elle ajoute:
- colonnes `verification_mode` (`properties`, `reservations`)
- tables `property_auto_links`, `blacklisted_guests`, `public_booking_attempts`
- index + politiques RLS associées

## Vérifications staging recommandées

1. Créer une propriété, générer un lien auto, vérifier ouverture de `/book/{token}`.
2. Soumettre 4 fois depuis la même IP pour confirmer déclenchement CAPTCHA à partir du seuil.
3. Ajouter un invité en liste noire puis tenter une réservation publique avec même e-mail/téléphone/nom.
4. Créer une réservation manuelle avec `smart_lock_code`, terminer le flow `/checkin/{unique_link}`, vérifier l’affichage final du code.
5. Vérifier le mode de vérification par propriété (`simple`/`complete`) puis l’override en réservation.
6. Contrôler accessibilité clavier:
   - fermeture modal via `Escape`
   - navigation tab sur menus support et formulaires publics
7. Vérifier mobile (375px) sur:
   - `/pricing`
   - `/blacklist`
   - `/book/{token}`
   - modale “Aperçu invité (démo)”
