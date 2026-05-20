import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'https://esm.sh/pdf-lib@1.17.1';
import fontkit from 'https://esm.sh/@pdf-lib/fontkit@1.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const BUCKET_NAME = 'police-bulletins';
// Full Amiri TTF (≈380KB) with the complete Arabic glyph set. The previous
// gstatic URL was a 20KB Latin-only subset, which silently embedded into the
// PDF but produced empty .notdef boxes for every Arabic codepoint we tried to
// draw — hence the missing right-side labels.
const AMIRI_FONT_URL = 'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHqUp.ttf';
const ONE_HOUR_IN_SECONDS = 60 * 60;

const LAYOUT = {
  page: {
    width: 595.28,
    height: 841.89,
  },
  margins: {
    left: 48,
    right: 48,
    top: 54,
    bottom: 56,
  },
  header: {
    titleY: 786,
    arabicTitleY: 764,
  },
  summary: {
    // "Appart N°: ......" on the far left, "N° ordre: ...... رقم الترتيب"
    // on the far right — single dotted-underline value in each block.
    apartmentLabelX: 50,
    apartmentLineStartX: 110,
    apartmentLineEndX: 220,
    apartmentValueX: 116,
    ordreLabelX: 340,
    ordreLineStartX: 395,
    ordreLineEndX: 460,
    ordreValueX: 400,
    rtlOrderLabelRightX: 545,
    summaryY: 736,
  },
  // Each row is one full line: bilingual EN/FR label on the left, ONE long
  // dotted underline carrying the value across the middle, Arabic label on
  // the right — mirroring the official Moroccan template.
  columns: {
    leftLabelX: 50,
    valueLineStartX: 220,
    valueLineEndX: 415,
    valueTextX: 223,
    rightLabelRightX: 545,
  },
  rows: {
    firstY: 692,
    step: 42,
  },
  footer: {
    dateLabelX: 52,
    dateValueX: 84,
    dateLineStartX: 82,
    dateLineEndX: 210,
    dateY: 199,
    dateArabicLabelRightX: 542,
    dateArabicLineStartX: 432,
    dateArabicLineEndX: 520,
    signatureLabelY: 132,
    signatureLineStartX: 150,
    signatureLineEndX: 308,
    signatureLineY: 145,
    signatureImageX: 168,
    signatureImageY: 153,
    signatureImageMaxWidth: 118,
    signatureImageMaxHeight: 36,
    signatureArabicLineStartX: 412,
    signatureArabicLineEndX: 506,
    signatureArabicLabelRightX: 542,
    signatureArabicY: 145,
  },
  verificationCode: {
    dividerY: 112,
    labelY: 100,
    codeY: 88,
  },
} as const;

const STYLE = {
  colors: {
    text: rgb(0.1, 0.1, 0.1),
    muted: rgb(0.45, 0.45, 0.45),
    line: rgb(0.55, 0.55, 0.55),
    // Peach pill background behind the "Bulletin individuel" title — matches
    // the reference layout shared by the host.
    titlePill: rgb(0.97, 0.82, 0.66),
  },
  fontSize: {
    header: 16,
    arabicHeader: 16,
    label: 11,
    subtitle: 8.5,
    value: 10.5,
    signature: 10,
  },
  dotted: {
    segmentWidth: 2.2,
    gapWidth: 2.7,
    thickness: 0.7,
  },
  titlePill: {
    paddingX: 24,
    paddingY: 10,
    radius: 22,
  },
} as const;

type CallerRole = 'anon' | 'authenticated';

type GeneratePoliceBulletinRequest = {
  reservationId?: string;
  regenerate?: boolean;
};

type ContractRecord = {
  id?: string | null;
  guest_signature_url?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
};

type HostRecord = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type PropertyRecord = {
  id?: string | null;
  name?: string | null;
  appart_no?: string | null;
  host_id?: string | null;
  hosts?: HostRecord | HostRecord[] | null;
};

type GuestRecord = {
  id?: string | null;
  full_name?: string | null;
};

type ReservationRecord = {
  id?: string | null;
  check_in_date?: string | null;
  properties?: PropertyRecord | PropertyRecord[] | null;
  guests?: GuestRecord | GuestRecord[] | null;
  contracts?: ContractRecord | ContractRecord[] | null;
};

type BulletinRecord = {
  id: string;
  reservation_id: string;
  host_id: string;
  property_id?: string | null;
  appart_no?: string | null;
  ordre_no?: number | null;
  full_name?: string | null;
  first_name?: string | null;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  nationality?: string | null;
  profession?: string | null;
  coming_from?: string | null;
  going_to?: string | null;
  arrival_date?: string | null;
  home_address?: string | null;
  passport_no?: string | null;
  signature_url?: string | null;
  pdf_storage_path?: string | null;
  submitted_at?: string | null;
  verification_code?: string | null;
  reservations?: ReservationRecord | ReservationRecord[] | null;
};

type LeftField = {
  label: string;
  subtitle: string;
  value: string;
};

type RightField = {
  label: string;
  value: string;
};

type EmbeddedFonts = {
  latin: PDFFont;
  latinBold: PDFFont;
  latinItalic: PDFFont;
  arabic: PDFFont;
  mono: PDFFont;
};

const ARABIC_FORMS: Record<string, {
  isolated: string;
  final?: string;
  initial?: string;
  medial?: string;
  connectsBefore: boolean;
  connectsAfter: boolean;
}> = {
  'ء': { isolated: 'ﺀ', connectsBefore: false, connectsAfter: false },
  'آ': { isolated: 'ﺁ', final: 'ﺂ', connectsBefore: true, connectsAfter: false },
  'أ': { isolated: 'ﺃ', final: 'ﺄ', connectsBefore: true, connectsAfter: false },
  'إ': { isolated: 'ﺇ', final: 'ﺈ', connectsBefore: true, connectsAfter: false },
  'ا': { isolated: 'ﺍ', final: 'ﺎ', connectsBefore: true, connectsAfter: false },
  'ب': { isolated: 'ﺏ', final: 'ﺐ', initial: 'ﺑ', medial: 'ﺒ', connectsBefore: true, connectsAfter: true },
  'ت': { isolated: 'ﺕ', final: 'ﺖ', initial: 'ﺗ', medial: 'ﺘ', connectsBefore: true, connectsAfter: true },
  'ث': { isolated: 'ﺙ', final: 'ﺚ', initial: 'ﺛ', medial: 'ﺜ', connectsBefore: true, connectsAfter: true },
  'ج': { isolated: 'ﺝ', final: 'ﺞ', initial: 'ﺟ', medial: 'ﺠ', connectsBefore: true, connectsAfter: true },
  'ح': { isolated: 'ﺡ', final: 'ﺢ', initial: 'ﺣ', medial: 'ﺤ', connectsBefore: true, connectsAfter: true },
  'خ': { isolated: 'ﺥ', final: 'ﺦ', initial: 'ﺧ', medial: 'ﺨ', connectsBefore: true, connectsAfter: true },
  'د': { isolated: 'ﺩ', final: 'ﺪ', connectsBefore: true, connectsAfter: false },
  'ذ': { isolated: 'ﺫ', final: 'ﺬ', connectsBefore: true, connectsAfter: false },
  'ر': { isolated: 'ﺭ', final: 'ﺮ', connectsBefore: true, connectsAfter: false },
  'ز': { isolated: 'ﺯ', final: 'ﺰ', connectsBefore: true, connectsAfter: false },
  'س': { isolated: 'ﺱ', final: 'ﺲ', initial: 'ﺳ', medial: 'ﺴ', connectsBefore: true, connectsAfter: true },
  'ش': { isolated: 'ﺵ', final: 'ﺶ', initial: 'ﺷ', medial: 'ﺸ', connectsBefore: true, connectsAfter: true },
  'ص': { isolated: 'ﺹ', final: 'ﺺ', initial: 'ﺻ', medial: 'ﺼ', connectsBefore: true, connectsAfter: true },
  'ض': { isolated: 'ﺽ', final: 'ﺾ', initial: 'ﺿ', medial: 'ﻀ', connectsBefore: true, connectsAfter: true },
  'ط': { isolated: 'ﻁ', final: 'ﻂ', initial: 'ﻃ', medial: 'ﻄ', connectsBefore: true, connectsAfter: true },
  'ظ': { isolated: 'ﻅ', final: 'ﻆ', initial: 'ﻇ', medial: 'ﻈ', connectsBefore: true, connectsAfter: true },
  'ع': { isolated: 'ﻉ', final: 'ﻊ', initial: 'ﻋ', medial: 'ﻌ', connectsBefore: true, connectsAfter: true },
  'غ': { isolated: 'ﻍ', final: 'ﻎ', initial: 'ﻏ', medial: 'ﻐ', connectsBefore: true, connectsAfter: true },
  'ف': { isolated: 'ﻑ', final: 'ﻒ', initial: 'ﻓ', medial: 'ﻔ', connectsBefore: true, connectsAfter: true },
  'ق': { isolated: 'ﻕ', final: 'ﻖ', initial: 'ﻗ', medial: 'ﻘ', connectsBefore: true, connectsAfter: true },
  'ك': { isolated: 'ﻙ', final: 'ﻚ', initial: 'ﻛ', medial: 'ﻜ', connectsBefore: true, connectsAfter: true },
  'ل': { isolated: 'ﻝ', final: 'ﻞ', initial: 'ﻟ', medial: 'ﻠ', connectsBefore: true, connectsAfter: true },
  'م': { isolated: 'ﻡ', final: 'ﻢ', initial: 'ﻣ', medial: 'ﻤ', connectsBefore: true, connectsAfter: true },
  'ن': { isolated: 'ﻥ', final: 'ﻦ', initial: 'ﻧ', medial: 'ﻨ', connectsBefore: true, connectsAfter: true },
  'ه': { isolated: 'ﻩ', final: 'ﻪ', initial: 'ﻫ', medial: 'ﻬ', connectsBefore: true, connectsAfter: true },
  'ة': { isolated: 'ﺓ', final: 'ﺔ', connectsBefore: true, connectsAfter: false },
  'و': { isolated: 'ﻭ', final: 'ﻮ', connectsBefore: true, connectsAfter: false },
  'ى': { isolated: 'ﻯ', final: 'ﻰ', connectsBefore: true, connectsAfter: false },
  'ي': { isolated: 'ﻱ', final: 'ﻲ', initial: 'ﻳ', medial: 'ﻴ', connectsBefore: true, connectsAfter: true },
  'ئ': { isolated: 'ﺉ', final: 'ﺊ', initial: 'ﺋ', medial: 'ﺌ', connectsBefore: true, connectsAfter: true },
  'ؤ': { isolated: 'ﺅ', final: 'ﺆ', connectsBefore: true, connectsAfter: false },
};

let amiriFontBytesPromise: Promise<Uint8Array> | null = null;

function response(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asSingle<T>(value: T[] | T | null | undefined): T | null {
  return asArray(value)[0] ?? null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveCallerRole(authHeader: string | null): CallerRole | null {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  if (role === 'anon' || role === 'authenticated') {
    return role;
  }

  return null;
}

function formatDate(value: string | null | undefined): string {
  if (!isNonEmptyString(value)) return '';

  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Fall back to the raw string but strip non-WinAnsi chars so a bad value
    // cannot crash pdf-lib downstream.
    return sanitizeForWinAnsi(value);
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

// Helvetica StandardFont is WinAnsi-only — anything outside cp1252 (e.g. ∞, ™,
// curly quotes from mobile keyboards, emojis, ligatures) crashes pdf-lib with
// "WinAnsi cannot encode …". We strip those characters so a single weird
// keystroke in a guest form can never break the PDF download.
const WIN_ANSI_EXTRA = new Set([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017D, 0x017E, 0x0192, 0x02C6, 0x02DC,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2020, 0x2021,
  0x2022, 0x2026, 0x2030, 0x2039, 0x203A, 0x20AC, 0x2122,
]);

function sanitizeForWinAnsi(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x7F || (code >= 0xA0 && code <= 0xFF) || WIN_ANSI_EXTRA.has(code)) {
      out += ch;
    } else {
      out += '?';
    }
  }
  return out;
}

async function sha256Short(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8)
    .toUpperCase();
}

async function generateVerificationCode(
  documentType: string,
  reservationId: string,
  appartNo: string | null | undefined,
  ordreNo: number | null | undefined,
  guestName: string | null | undefined,
  submittedAt: string | null | undefined,
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const appart = (appartNo ?? 'APP')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(3, '0');
  const ordre = String(ordreNo ?? 0).padStart(4, '0');
  const payload = [
    reservationId,
    appartNo ?? '',
    String(ordreNo ?? ''),
    (guestName ?? '').toLowerCase(),
    submittedAt ?? '',
    date,
  ].join('|');
  const hash = await sha256Short(payload);
  return `HC-${documentType}-${date}-${appart}-${ordre}-${hash}`;
}

function compactValue(value: string | null | undefined): string {
  if (!isNonEmptyString(value)) return '—';
  return sanitizeForWinAnsi(value.replace(/\s+/g, ' ').trim());
}

function combineValue(parts: Array<string | null | undefined>): string {
  const filtered = parts
    .map((part) => compactValue(part))
    .filter((part) => part !== '—');

  return filtered.length > 0 ? filtered.join(' ') : '—';
}

function containsArabic(value: string): boolean {
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(value);
}

function shapeArabicText(text: string): string {
  const chars = [...text];

  return chars.map((char, index) => {
    const form = ARABIC_FORMS[char];
    if (!form) return char;

    const previous = ARABIC_FORMS[chars[index - 1] ?? ''];
    const next = ARABIC_FORMS[chars[index + 1] ?? ''];

    const joinsPrevious = Boolean(previous?.connectsAfter && form.connectsBefore);
    const joinsNext = Boolean(form.connectsAfter && next?.connectsBefore);

    if (joinsPrevious && joinsNext && form.medial) return form.medial;
    if (joinsPrevious && form.final) return form.final;
    if (joinsNext && form.initial) return form.initial;
    return form.isolated;
  }).join('');
}

function prepareRtlText(text: string): string {
  // TODO: preserve mixed Arabic + digit segments more precisely when guest data
  // contains embedded numbers or Latin characters that should keep LTR order.
  return [...shapeArabicText(text)].reverse().join('');
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (LAYOUT.page.width - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size);
  let output = '';

  for (const char of text) {
    const next = `${output}${char}`;
    if (font.widthOfTextAtSize(next, size) + ellipsisWidth > maxWidth) {
      break;
    }
    output = next;
  }

  return output ? `${output}${ellipsis}` : ellipsis;
}

function drawDottedLine(page: PDFPage, startX: number, endX: number, y: number): void {
  let cursor = startX;

  while (cursor < endX) {
    const segmentEnd = Math.min(cursor + STYLE.dotted.segmentWidth, endX);
    page.drawLine({
      start: { x: cursor, y },
      end: { x: segmentEnd, y },
      thickness: STYLE.dotted.thickness,
      color: STYLE.colors.line,
    });
    cursor += STYLE.dotted.segmentWidth + STYLE.dotted.gapWidth;
  }
}

function drawFieldRow(
  page: PDFPage,
  fonts: EmbeddedFonts,
  rowIndex: number,
  field: LeftField,
  rightLabel: string,
): void {
  const rowY = LAYOUT.rows.firstY - (rowIndex * LAYOUT.rows.step);

  // Bold English / primary label on top
  page.drawText(field.label, {
    x: LAYOUT.columns.leftLabelX,
    y: rowY + 6,
    font: fonts.latinBold,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text,
  });

  // Italic French subtitle below
  page.drawText(field.subtitle, {
    x: LAYOUT.columns.leftLabelX,
    y: rowY - 5,
    font: fonts.latinItalic,
    size: STYLE.fontSize.subtitle,
    color: STYLE.colors.muted,
  });

  // Single long dotted line carrying the value across the middle.
  drawDottedLine(
    page,
    LAYOUT.columns.valueLineStartX,
    LAYOUT.columns.valueLineEndX,
    rowY,
  );

  const valueIsArabic = containsArabic(field.value);
  const valueFont = valueIsArabic ? fonts.arabic : fonts.latin;
  const rawValue = valueIsArabic ? prepareRtlText(field.value) : field.value;
  const value = truncateToWidth(
    rawValue,
    valueFont,
    STYLE.fontSize.value,
    LAYOUT.columns.valueLineEndX - LAYOUT.columns.valueTextX,
  );

  page.drawText(value, {
    x: LAYOUT.columns.valueTextX,
    y: rowY + 4,
    font: valueFont,
    size: STYLE.fontSize.value,
    color: STYLE.colors.text,
  });

  // Right-aligned Arabic label — bold so it visually balances the bold English.
  const arabicLabel = prepareRtlText(rightLabel);
  const arabicLabelWidth = fonts.arabic.widthOfTextAtSize(
    arabicLabel,
    STYLE.fontSize.label,
  );
  page.drawText(arabicLabel, {
    x: LAYOUT.columns.rightLabelRightX - arabicLabelWidth,
    y: rowY + 4,
    font: fonts.arabic,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text,
  });
}

function pickLatestContract(contracts: ContractRecord[]): ContractRecord | null {
  if (contracts.length === 0) return null;

  return [...contracts].sort((left, right) => {
    const leftTime = new Date(left.signed_at ?? left.created_at ?? 0).getTime();
    const rightTime = new Date(right.signed_at ?? right.created_at ?? 0).getTime();
    return rightTime - leftTime;
  })[0] ?? null;
}

async function getAmiriFontBytes(): Promise<Uint8Array> {
  if (!amiriFontBytesPromise) {
    amiriFontBytesPromise = (async () => {
      const response = await fetch(AMIRI_FONT_URL);
      if (!response.ok) {
        throw new Error(`amiri_font_fetch_failed_${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    })();
  }

  return amiriFontBytesPromise;
}

async function embedSignatureImage(
  pdfDoc: PDFDocument,
  signatureSource: string | null | undefined,
): Promise<PDFImage | null> {
  if (!isNonEmptyString(signatureSource)) return null;

  const response = await fetch(signatureSource);
  if (!response.ok) {
    throw new Error(`signature_fetch_failed_${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return await pdfDoc.embedJpg(bytes);
  }

  return await pdfDoc.embedPng(bytes);
}

async function createSignedPdfUrl(
  storagePath: string,
): Promise<{ signedUrl: string | null; error?: string }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, ONE_HOUR_IN_SECONDS);

  if (error || !data?.signedUrl) {
    return {
      signedUrl: null,
      error: error?.message ?? 'signed_url_generation_failed',
    };
  }

  return { signedUrl: data.signedUrl };
}

async function fetchBulletinRecord(
  supabase: ReturnType<typeof createClient>,
  reservationId: string,
): Promise<BulletinRecord | null> {
  const { data, error } = await supabase
    .from('police_bulletins')
    .select(`
      id,
      reservation_id,
      host_id,
      property_id,
      appart_no,
      ordre_no,
      full_name,
      first_name,
      date_of_birth,
      place_of_birth,
      nationality,
      profession,
      coming_from,
      going_to,
      arrival_date,
      home_address,
      passport_no,
      signature_url,
      pdf_storage_path,
      submitted_at,
      verification_code,
      reservations!inner (
        id,
        check_in_date,
        properties (
          id,
          name,
          appart_no,
          host_id,
          hosts (
            id,
            full_name,
            email
          )
        ),
        guests (
          id,
          full_name
        ),
        contracts (
          id,
          guest_signature_url,
          signed_at,
          created_at
        )
      )
    `)
    .eq('reservation_id', reservationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BulletinRecord;
}

async function buildBulletinPdf(
  bulletin: BulletinRecord,
  verificationCode: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([LAYOUT.page.width, LAYOUT.page.height]);
  const [latin, latinBold, latinItalic, mono] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    pdfDoc.embedFont(StandardFonts.Courier),
  ]);
  const amiri = await pdfDoc.embedFont(await getAmiriFontBytes(), { subset: true });
  const fonts: EmbeddedFonts = { latin, latinBold, latinItalic, arabic: amiri, mono };

  const reservation = asSingle(bulletin.reservations);
  const property = asSingle(reservation?.properties);
  const latestContract = pickLatestContract(asArray(reservation?.contracts));
  const signatureSource = latestContract?.guest_signature_url ?? bulletin.signature_url ?? null;

  // Peach rounded-rectangle pill behind both titles ("Bulletin individuel ورقة
  // شخصية") — the official Moroccan template uses this accent and the host
  // explicitly asked the PDF to match that visual.
  const titleLatin = 'Bulletin individuel';
  const titleArabic = prepareRtlText('ورقة شخصية');
  const titleLatinWidth = fonts.latinBold.widthOfTextAtSize(titleLatin, STYLE.fontSize.header);
  const titleArabicWidth = fonts.arabic.widthOfTextAtSize(titleArabic, STYLE.fontSize.arabicHeader);
  const titlesGap = 18;
  const pillWidth = titleLatinWidth + titleArabicWidth + titlesGap + STYLE.titlePill.paddingX * 2;
  const pillHeight = STYLE.fontSize.header + STYLE.titlePill.paddingY * 2;
  const pillBaselineY = LAYOUT.header.titleY;
  const pillX = (LAYOUT.page.width - pillWidth) / 2;
  const pillY = pillBaselineY - STYLE.titlePill.paddingY + 2;

  page.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillWidth,
    height: pillHeight,
    color: STYLE.colors.titlePill,
    borderColor: STYLE.colors.titlePill,
    borderWidth: 0,
  });

  page.drawText(titleLatin, {
    x: pillX + STYLE.titlePill.paddingX,
    y: pillBaselineY,
    size: STYLE.fontSize.header,
    font: fonts.latinBold,
    color: STYLE.colors.text,
  });
  page.drawText(titleArabic, {
    x: pillX + STYLE.titlePill.paddingX + titleLatinWidth + titlesGap,
    y: pillBaselineY,
    size: STYLE.fontSize.arabicHeader,
    font: fonts.arabic,
    color: STYLE.colors.text,
  });

  // Header summary: Appart N° (left) ＋ N° ordre + Arabic mirror (right).
  page.drawText('Appart N°:', {
    x: LAYOUT.summary.apartmentLabelX,
    y: LAYOUT.summary.summaryY,
    font: fonts.latin,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text,
  });
  drawDottedLine(
    page,
    LAYOUT.summary.apartmentLineStartX,
    LAYOUT.summary.apartmentLineEndX,
    LAYOUT.summary.summaryY - 1,
  );
  page.drawText(compactValue(bulletin.appart_no ?? property?.appart_no), {
    x: LAYOUT.summary.apartmentValueX,
    y: LAYOUT.summary.summaryY + 1,
    font: fonts.latin,
    size: STYLE.fontSize.value,
    color: STYLE.colors.text,
  });

  page.drawText('N° ordre:', {
    x: LAYOUT.summary.ordreLabelX,
    y: LAYOUT.summary.summaryY,
    font: fonts.latin,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text,
  });
  drawDottedLine(
    page,
    LAYOUT.summary.ordreLineStartX,
    LAYOUT.summary.ordreLineEndX,
    LAYOUT.summary.summaryY - 1,
  );
  page.drawText(String(bulletin.ordre_no ?? ''), {
    x: LAYOUT.summary.ordreValueX,
    y: LAYOUT.summary.summaryY + 1,
    font: fonts.latin,
    size: STYLE.fontSize.value,
    color: STYLE.colors.text,
  });

  const rtlOrderLabel = prepareRtlText('رقم الترتيب');
  const rtlOrderLabelWidth = fonts.arabic.widthOfTextAtSize(rtlOrderLabel, STYLE.fontSize.label);
  page.drawText(rtlOrderLabel, {
    x: LAYOUT.summary.rtlOrderLabelRightX - rtlOrderLabelWidth,
    y: LAYOUT.summary.summaryY,
    font: fonts.arabic,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text
  });

  // Each row carries: bold EN label + italic FR subtitle on the left,
  // one long dotted underline with the value across the middle, RTL Arabic
  // label on the right. Layout mirrors the official Moroccan template the
  // host shared.
  const rows: Array<{ left: LeftField; rightLabel: string }> = [
    {
      left: { label: 'Name:', subtitle: 'Nom :', value: compactValue(bulletin.full_name) },
      rightLabel: 'الاسم العائلي',
    },
    {
      left: { label: 'Surname:', subtitle: 'Prénom :', value: compactValue(bulletin.first_name) },
      rightLabel: 'الاسم الشخصي',
    },
    {
      left: {
        label: 'Date & Place of birth:',
        subtitle: 'Date et lieu de naissance :',
        value: combineValue([formatDate(bulletin.date_of_birth), bulletin.place_of_birth]),
      },
      rightLabel: 'مكان وتاريخ الازدياد',
    },
    {
      left: { label: 'Nationality:', subtitle: 'Nationalité :', value: compactValue(bulletin.nationality) },
      rightLabel: 'الجنسية',
    },
    {
      left: { label: 'Profession:', subtitle: 'Profession :', value: compactValue(bulletin.profession) },
      rightLabel: 'المهنة',
    },
    {
      left: { label: 'Coming from:', subtitle: 'Provenance :', value: compactValue(bulletin.coming_from) },
      rightLabel: 'محل القدوم',
    },
    {
      left: { label: 'Going to:', subtitle: 'Destination :', value: compactValue(bulletin.going_to) },
      rightLabel: 'الذهاب الى',
    },
    {
      left: {
        label: 'Date of arrival in Morocco:',
        subtitle: "Date d'entrée au Maroc :",
        value: formatDate(bulletin.arrival_date ?? reservation?.check_in_date),
      },
      rightLabel: 'تاريخ دخول المغرب',
    },
    {
      left: { label: 'Home address:', subtitle: 'Domicile habituel :', value: compactValue(bulletin.home_address) },
      rightLabel: 'محل السكنى',
    },
    {
      left: { label: 'N° Passport:', subtitle: 'N° passeport :', value: compactValue(bulletin.passport_no) },
      rightLabel: 'رقم جواز السفر',
    },
  ];

  rows.forEach((row, index) => drawFieldRow(page, fonts, index, row.left, row.rightLabel));

  const issuedOn = formatDate(latestContract?.signed_at ?? bulletin.submitted_at ?? new Date().toISOString());
  page.drawText('Le:', {
    x: LAYOUT.footer.dateLabelX,
    y: LAYOUT.footer.dateY,
    font: fonts.latin,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text,
  });
  drawDottedLine(page, LAYOUT.footer.dateLineStartX, LAYOUT.footer.dateLineEndX, LAYOUT.footer.dateY + 2);
  page.drawText(issuedOn || '—', {
    x: LAYOUT.footer.dateValueX,
    y: LAYOUT.footer.dateY,
    font: fonts.latin,
    size: STYLE.fontSize.value,
    color: STYLE.colors.text,
  });

  const dateArabicLabel = prepareRtlText('في');
  const dateArabicLabelWidth = fonts.arabic.widthOfTextAtSize(dateArabicLabel, STYLE.fontSize.label);
  drawDottedLine(
    page,
    LAYOUT.footer.dateArabicLineStartX,
    LAYOUT.footer.dateArabicLineEndX,
    LAYOUT.footer.dateY + 2,
  );
  page.drawText(dateArabicLabel, {
    x: LAYOUT.footer.dateArabicLabelRightX - dateArabicLabelWidth,
    y: LAYOUT.footer.dateY,
    font: fonts.arabic,
    size: STYLE.fontSize.label,
    color: STYLE.colors.text,
  });

  drawDottedLine(
    page,
    LAYOUT.footer.signatureLineStartX,
    LAYOUT.footer.signatureLineEndX,
    LAYOUT.footer.signatureLineY,
  );

  if (signatureSource) {
    try {
      const signatureImage = await embedSignatureImage(pdfDoc, signatureSource);
      if (signatureImage) {
        const scale = Math.min(
          LAYOUT.footer.signatureImageMaxWidth / signatureImage.width,
          LAYOUT.footer.signatureImageMaxHeight / signatureImage.height,
          1,
        );
        const width = signatureImage.width * scale;
        const height = signatureImage.height * scale;
        page.drawImage(signatureImage, {
          x: LAYOUT.footer.signatureImageX,
          y: LAYOUT.footer.signatureImageY,
          width,
          height,
        });
      }
    } catch (error) {
      console.warn('police bulletin signature embed failed:', error);
    }
  }

  drawDottedLine(
    page,
    LAYOUT.footer.signatureArabicLineStartX,
    LAYOUT.footer.signatureArabicLineEndX,
    LAYOUT.footer.signatureArabicY,
  );
  const signatureArabicLabel = prepareRtlText('إمضاء');
  const signatureArabicLabelWidth = fonts.arabic.widthOfTextAtSize(signatureArabicLabel, STYLE.fontSize.signature);
  page.drawText(signatureArabicLabel, {
    x: LAYOUT.footer.signatureArabicLabelRightX - signatureArabicLabelWidth,
    y: LAYOUT.footer.signatureArabicY - 2,
    font: fonts.arabic,
    size: STYLE.fontSize.signature,
    color: STYLE.colors.text,
  });

  // "Signature" text label centered below the left signature dotted line
  const signatureLabel = 'Signature';
  const signatureLabelWidth = fonts.latin.widthOfTextAtSize(signatureLabel, STYLE.fontSize.signature);
  const signatureLabelCenterX = (LAYOUT.footer.signatureLineStartX + LAYOUT.footer.signatureLineEndX) / 2;
  page.drawText(signatureLabel, {
    x: signatureLabelCenterX - signatureLabelWidth / 2,
    y: LAYOUT.footer.signatureLabelY,
    font: fonts.latin,
    size: STYLE.fontSize.signature,
    color: STYLE.colors.muted,
  });

  // Thin gray separator line
  drawDottedLine(
    page,
    LAYOUT.margins.left,
    LAYOUT.page.width - LAYOUT.margins.right,
    LAYOUT.verificationCode.dividerY,
  );

  // Label
  const vcLabel = 'Code cryptographique / Verification code :';
  page.drawText(vcLabel, {
    x: LAYOUT.margins.left,
    y: LAYOUT.verificationCode.labelY,
    font: fonts.latinItalic,
    size: 7,
    color: STYLE.colors.muted,
  });

  // The HC-FP-... code in Courier monospace, centered
  const vcLabelWidth = fonts.latinItalic.widthOfTextAtSize(vcLabel, 7);
  const vcCodeText = verificationCode;
  const vcCodeWidth = fonts.mono.widthOfTextAtSize(vcCodeText, 8);
  const pageCenter = LAYOUT.page.width / 2;
  page.drawText(vcCodeText, {
    x: pageCenter - vcCodeWidth / 2,
    y: LAYOUT.verificationCode.codeY,
    font: fonts.mono,
    size: 8,
    color: STYLE.colors.text,
  });
  void vcLabelWidth;

  return await pdfDoc.save();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return response(405, { error: 'method_not_allowed' });
  }

  const callerRole = resolveCallerRole(req.headers.get('Authorization'));
  if (!callerRole) {
    return response(401, { error: 'unauthorized' });
  }
  void callerRole;

  let body: GeneratePoliceBulletinRequest;
  try {
    body = await req.json() as GeneratePoliceBulletinRequest;
  } catch {
    return response(400, { error: 'invalid_json_payload' });
  }

  if (!isNonEmptyString(body.reservationId)) {
    return response(400, { error: 'reservation_id_required' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return response(500, { error: 'supabase_env_missing' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const bulletin = await fetchBulletinRecord(supabase, body.reservationId);

    if (!bulletin || !bulletin.submitted_at) {
      return response(404, { error: 'bulletin_not_submitted' });
    }

    if (isNonEmptyString(bulletin.pdf_storage_path) && body.regenerate !== true) {
      const existingUrl = await createSignedPdfUrl(bulletin.pdf_storage_path);
      if (existingUrl.signedUrl) {
        return response(200, {
          success: true,
          pdf_url: existingUrl.signedUrl,
          storage_path: bulletin.pdf_storage_path,
          verification_code: bulletin.verification_code ?? null,
        });
      }
    }

    const reservation = asSingle(bulletin.reservations);
    const property = asSingle(reservation?.properties);
    const verificationCode =
      isNonEmptyString(bulletin.verification_code) && body.regenerate !== true
        ? bulletin.verification_code
        : await generateVerificationCode(
            'FP',
            bulletin.reservation_id,
            bulletin.appart_no ?? property?.appart_no,
            bulletin.ordre_no,
            bulletin.full_name,
            bulletin.submitted_at,
          );

    const pdfBytes = await buildBulletinPdf(bulletin, verificationCode);
    const storagePath = `${bulletin.host_id}/${bulletin.reservation_id}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return response(500, { error: 'pdf_upload_failed', details: uploadError.message });
    }

    const { error: updateError } = await supabase
      .from('police_bulletins')
      .update({
        pdf_storage_path: storagePath,
        verification_code: verificationCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bulletin.id);

    if (updateError) {
      return response(500, { error: 'bulletin_update_failed', details: updateError.message });
    }

    const signedUrlResult = await createSignedPdfUrl(storagePath);
    if (!signedUrlResult.signedUrl) {
      return response(500, {
        error: 'signed_url_generation_failed',
        details: signedUrlResult.error ?? 'unknown_signed_url_error',
      });
    }

    return response(200, {
      success: true,
      pdf_url: signedUrlResult.signedUrl,
      storage_path: storagePath,
      verification_code: verificationCode,
    });
  } catch (error) {
    console.error('generate-police-bulletin error:', error);
    return response(500, {
      error: error instanceof Error ? error.message : 'unexpected_error',
    });
  }
});
