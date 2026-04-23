import { describe, expect, it } from 'vitest';
import {
  buildNotificationMessage,
  defaultRules,
  toggleRule,
  validateNotificationPayload,
  type NotificationPayload,
} from '../../src/lib/automations-logic';

const VALID_PAYLOAD: NotificationPayload = {
  reservationId: 'reservation-123',
  trigger: 'checkin_reminder_j1',
  channel: 'both',
  recipientType: 'guest',
  guestName: 'Sofia Martin',
  guestEmail: 'sofia@example.com',
  guestPhone: '+33600000000',
  propertyName: 'Villa Atlas',
  checkinDate: '2026-05-01',
  checkoutDate: '2026-05-04',
  hostEmail: 'host@example.com',
  hostPhone: '+212600000000',
  senderName: 'HostCheckIn Team',
};

describe('automations logic', () => {
  describe('buildNotificationMessage', () => {
    it('retourne le bon template pour checkin_reminder_j1', () => {
      const message = buildNotificationMessage('checkin_reminder_j1', VALID_PAYLOAD);
      expect(message).toBe(
        "Bonjour Sofia Martin, votre arrivée à Villa Atlas est demain. Check-in prévu le 2026-05-01. N'hésitez pas à nous contacter.",
      );
    });

    it('retourne le bon template pour checkin_day', () => {
      const message = buildNotificationMessage('checkin_day', VALID_PAYLOAD);
      expect(message).toBe(
        "Bonjour Sofia Martin, bienvenue ! Votre check-in à Villa Atlas est aujourd'hui. Nous sommes disponibles pour vous accueillir.",
      );
    });

    it('retourne le bon template pour checkout_reminder', () => {
      const message = buildNotificationMessage('checkout_reminder', VALID_PAYLOAD);
      expect(message).toBe(
        'Bonjour Sofia Martin, votre séjour à Villa Atlas se termine demain. Check-out prévu le 2026-05-04. Merci pour votre confiance.',
      );
    });

    it('retourne le bon template pour contract_signed', () => {
      const message = buildNotificationMessage('contract_signed', VALID_PAYLOAD);
      expect(message).toBe(
        'Bonjour Sofia Martin, votre contrat de séjour pour Villa Atlas a bien été signé. Bonne préparation !',
      );
    });

    it('retourne le bon template pour verification_complete', () => {
      const message = buildNotificationMessage('verification_complete', VALID_PAYLOAD);
      expect(message).toBe(
        "Bonjour HostCheckIn Team, l'identité de Sofia Martin pour Villa Atlas vient d'être vérifiée avec succès.",
      );
    });
  });

  describe('validateNotificationPayload', () => {
    it('valide un payload complet', () => {
      expect(validateNotificationPayload(VALID_PAYLOAD)).toBe(true);
    });

    it('invalide un payload incomplet', () => {
      const invalidPayload = {
        ...VALID_PAYLOAD,
        guestName: '',
      };

      expect(validateNotificationPayload(invalidPayload)).toBe(false);
    });

    it('invalide un payload avec channel inconnu', () => {
      const invalidPayload = {
        ...VALID_PAYLOAD,
        channel: 'push',
      };

      expect(validateNotificationPayload(invalidPayload as unknown as NotificationPayload)).toBe(false);
    });
  });

  describe('defaultRules', () => {
    it('contient 5 règles et elles sont activées par défaut', () => {
      expect(defaultRules).toHaveLength(5);
      expect(defaultRules.every((rule) => rule.enabled)).toBe(true);
    });
  });

  describe('toggleRule', () => {
    it('inverse le statut enabled pour la règle ciblée', () => {
      const targetId = defaultRules[0].id;
      const toggled = toggleRule(defaultRules, targetId);
      const toggledRule = toggled.find((rule) => rule.id === targetId);

      expect(toggledRule?.enabled).toBe(false);
      expect(toggled.filter((rule) => rule.id !== targetId)).toEqual(
        defaultRules.filter((rule) => rule.id !== targetId),
      );
    });
  });
});
