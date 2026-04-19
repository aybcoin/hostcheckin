export type MessageLocale = "fr" | "en" | "ar" | "es";
export type MessageTemplateId = "standard" | "reminder24h" | "withLockCode" | "security";

export const messageTemplateLocales: Array<{ key: MessageLocale; label: string }> = [
  { key: "fr", label: "🇫🇷 FR" },
  { key: "en", label: "🇬🇧 EN" },
  { key: "ar", label: "🇸🇦 AR" },
  { key: "es", label: "🇪🇸 ES" },
];

export const messageTemplates: Record<MessageLocale, Record<MessageTemplateId, string>> = {
  fr: {
    standard:
      "Bonjour [NOM],\n\nBienvenue chez [PROPRIETE]. Merci de compléter votre check-in en ligne via ce lien :\n[LIEN]\n\nÀ très bientôt.",
    reminder24h:
      "Bonjour [NOM],\n\nRappel pour votre arrivée dans 24 h chez [PROPRIETE]. Merci de finaliser votre check-in ici :\n[LIEN]\n\nNous restons à votre disposition.",
    withLockCode:
      "Bonjour [NOM],\n\nVotre check-in pour [PROPRIETE] est prêt. Merci de compléter la vérification via :\n[LIEN]\n\nCode de serrure : [CODE_SERRURE]\n\nBonne installation.",
    security:
      "Bonjour [NOM],\n\nPour des raisons de sécurité, merci de vérifier votre identité avant votre arrivée à [PROPRIETE] :\n[LIEN]\n\nLe code d’accès sera communiqué après validation.",
  },
  en: {
    standard:
      "Hello [NOM],\n\nWelcome to [PROPRIETE]. Please complete your check-in using this link:\n[LIEN]\n\nSee you soon.",
    reminder24h:
      "Hello [NOM],\n\nReminder for your arrival in 24h at [PROPRIETE]. Please complete your check-in here:\n[LIEN]\n\nWe remain available if needed.",
    withLockCode:
      "Hello [NOM],\n\nYour check-in for [PROPRIETE] is ready. Please complete verification here:\n[LIEN]\n\nLock code: [CODE_SERRURE]\n\nWelcome.",
    security:
      "Hello [NOM],\n\nFor security reasons, please complete identity verification before arriving at [PROPRIETE]:\n[LIEN]\n\nYour access code will be shared after validation.",
  },
  ar: {
    standard:
      "مرحبًا [NOM]،\n\nمرحبًا بك في [PROPRIETE]. يُرجى إكمال تسجيل الوصول عبر الرابط التالي:\n[LIEN]\n\nشكرًا لك.",
    reminder24h:
      "مرحبًا [NOM]،\n\nتذكير بوصولك خلال 24 ساعة إلى [PROPRIETE]. يُرجى إتمام تسجيل الوصول هنا:\n[LIEN]\n\nنحن رهن إشارتك.",
    withLockCode:
      "مرحبًا [NOM]،\n\nتسجيل الوصول الخاص بك في [PROPRIETE] جاهز. يُرجى إكمال التحقق عبر:\n[LIEN]\n\nرمز القفل: [CODE_SERRURE]\n\nإقامة سعيدة.",
    security:
      "مرحبًا [NOM]،\n\nلأسباب أمنية، يرجى إتمام التحقق من الهوية قبل الوصول إلى [PROPRIETE]:\n[LIEN]\n\nسيتم إرسال رمز الدخول بعد التحقق.",
  },
  es: {
    standard:
      "Hola [NOM],\n\nBienvenido a [PROPRIETE]. Por favor completa tu check-in en este enlace:\n[LIEN]\n\n¡Hasta pronto!",
    reminder24h:
      "Hola [NOM],\n\nRecordatorio: tu llegada a [PROPRIETE] es en 24 h. Finaliza tu check-in aquí:\n[LIEN]\n\nEstamos a tu disposición.",
    withLockCode:
      "Hola [NOM],\n\nTu check-in para [PROPRIETE] está listo. Completa la verificación aquí:\n[LIEN]\n\nCódigo de cerradura: [CODE_SERRURE]\n\nBienvenido.",
    security:
      "Hola [NOM],\n\nPor motivos de seguridad, completa la verificación de identidad antes de llegar a [PROPRIETE]:\n[LIEN]\n\nEl código de acceso se enviará tras la validación.",
  },
};

export function interpolateMessageTemplate(
  content: string,
  values: {
    link: string;
    guestName: string;
    propertyName: string;
    lockCode: string;
  },
): string {
  return content
    .replace(/\[LIEN\]/g, values.link)
    .replace(/\[NOM\]/g, values.guestName)
    .replace(/\[PROPRIETE\]/g, values.propertyName)
    .replace(/\[CODE_SERRURE\]/g, values.lockCode);
}
