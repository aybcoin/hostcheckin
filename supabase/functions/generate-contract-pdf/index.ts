import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { inflate as pakoInflate, deflate as pakoDeflate } from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Colors ────────────────────────────────────────────────────────
// Sober contractual palette — deep navy, soft grays, discreet orange accent.
// No flashy blue, no aggressive green; pending state uses a muted ochre.
const INK      = rgb(0.090, 0.122, 0.180); // near-black body text
const NAVY     = rgb(0.082, 0.157, 0.275); // deep navy — primary brand
const NAVY_2   = rgb(0.047, 0.110, 0.212); // darker navy for depth
const BLUE     = rgb(0.220, 0.388, 0.612); // muted blue accent (less saturated)
const BLUE_DK  = rgb(0.145, 0.282, 0.486); // darker blue
const BLUE_SOFT= rgb(0.957, 0.969, 0.984); // very light blue card bg
const BLUE_M   = rgb(0.808, 0.847, 0.902); // medium blue border
const ACCENT   = rgb(0.831, 0.486, 0.157); // discreet orange accent (signature)
const ACCENT_L = rgb(0.996, 0.949, 0.890); // accent bg
const ACCENT_M = rgb(0.937, 0.788, 0.580); // accent border
const SOFT_OK  = rgb(0.948, 0.957, 0.976); // sober validated bg (blue-gray, no green cast)
const SOFT_OK_BD = rgb(0.760, 0.812, 0.890); // sober validated border
const SOFT_OK_FG = rgb(0.118, 0.231, 0.392); // sober validated text
const GRAY_1   = rgb(0.337, 0.369, 0.420); // body secondary
const GRAY_2   = rgb(0.529, 0.553, 0.604); // muted
const GRAY_3   = rgb(0.851, 0.863, 0.886); // dividers
const GRAY_4   = rgb(0.933, 0.941, 0.957); // very light divider
const GRAY_BG  = rgb(0.976, 0.980, 0.988); // soft card bg
const GRAY_BG2 = rgb(0.965, 0.969, 0.976); // alt row bg
const WHITE    = rgb(1, 1, 1);

// ── Crypto ────────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Bytes(b: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(buf)).map((b2) => b2.toString(16).padStart(2, "0")).join("");
}

// ── Text sanitizer (keep WinAnsi / Latin-1) ──────────────────────
function clean(t: string): string {
  return t
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201C\u201D\u00ab\u00bb]/g, '"')
    .replace(/[\u2014\u2e3b\u2e3a]/g, "--")
    .replace(/[\u2013\u2012\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25e6\u2043]/g, "*")
    .replace(/[\u00a0\u202f\u2009\u200b]/g, " ")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/[^\x00-\xff]/g, "?");
}

// ── Word wrap (char-based fallback) ──────────────────────────────
function wrap(text: string, maxCh: number): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) { out.push(""); continue; }
    let rem = raw;
    while (rem.length > maxCh) {
      let brk = rem.lastIndexOf(" ", maxCh);
      if (brk <= 0) brk = maxCh;
      out.push(rem.slice(0, brk));
      rem = rem.slice(brk).trimStart();
    }
    out.push(rem);
  }
  return out;
}

// ── Width-based wrap — measures actual glyph widths ──────────────
// Returns per-line data including a flag marking the last line of a
// paragraph (so the caller can skip justification on that line, like CSS
// `text-align: justify` leaves the final line flush-left).
// deno-lint-ignore no-explicit-any
function wrapByWidth(text: string, maxW: number, size: number, f: any)
  : Array<{ text: string; lastOfPara: boolean; blank: boolean }> {
  const out: Array<{ text: string; lastOfPara: boolean; blank: boolean }> = [];
  const paragraphs = clean(text).split("\n");
  for (let p = 0; p < paragraphs.length; p++) {
    const raw = paragraphs[p];
    if (!raw.trim()) { out.push({ text: "", lastOfPara: true, blank: true }); continue; }
    const words = raw.split(/\s+/);
    const lineBuf: string[] = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(trial, size) <= maxW) {
        cur = trial;
      } else {
        if (cur) lineBuf.push(cur);
        cur = w;
      }
    }
    if (cur) lineBuf.push(cur);
    for (let i = 0; i < lineBuf.length; i++) {
      out.push({ text: lineBuf[i], lastOfPara: i === lineBuf.length - 1, blank: false });
    }
  }
  return out;
}

// ── Device fingerprint from user-agent ───────────────────────────
function deviceFromUA(ua: string): { device: string; browser: string; os: string } {
  if (!ua || ua === "unknown") return { device: "Inconnu", browser: "Inconnu", os: "Inconnu" };
  let device = "Ordinateur";
  let os = "Inconnu";
  let browser = "Inconnu";
  if (/iPhone/i.test(ua)) { device = "Smartphone (iPhone)"; os = "iOS"; }
  else if (/iPad/i.test(ua)) { device = "Tablette (iPad)"; os = "iPadOS"; }
  else if (/Android.*Mobile/i.test(ua)) { device = "Smartphone (Android)"; os = "Android"; }
  else if (/Android/i.test(ua)) { device = "Tablette (Android)"; os = "Android"; }
  else if (/Macintosh|Mac OS X/i.test(ua)) { device = "Ordinateur Mac"; os = "macOS"; }
  else if (/Windows/i.test(ua)) { device = "Ordinateur Windows"; os = "Windows"; }
  else if (/Linux/i.test(ua)) { device = "Ordinateur Linux"; os = "Linux"; }

  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\/|Opera\//i.test(ua)) browser = "Opera";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return { device, browser, os };
}

function idTypeLabel(t?: string | null): string {
  switch ((t || "").toLowerCase()) {
    case "cin": return "Carte nationale d'identité";
    case "passport": return "Passeport";
    case "driver_license": return "Permis de conduire";
    case "sejour": return "Titre de séjour";
    default: return "Document non précisé";
  }
}

// Map a raw KYC status to a clean French label (no English jargon in UI).
function kycStatusLabel(s?: string | null): string {
  switch ((s || "").toLowerCase()) {
    case "approved":
    case "verified":
    case "valid":
      return "Identité vérifiée";
    case "pending":
    case "processing":
    case "in_review":
      return "Vérification en cours";
    case "rejected":
    case "failed":
    case "invalid":
      return "Identité non vérifiée";
    default:
      return "Statut non communiqué";
  }
}

// ── PNG blue-ink processor (signatures) ──────────────────────────
function u32(buf: Uint8Array, off: number) {
  return ((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]) >>> 0;
}
function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function inflateZ(data: Uint8Array): Uint8Array { return pakoInflate(data); }
function deflateZ(data: Uint8Array): Uint8Array { return new Uint8Array(pakoDeflate(data, { level: 6 })); }
function crc32(d: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (const b of d) { c ^= b; for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const tb = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, data.length);
  chunk.set(tb, 4); chunk.set(data, 8);
  const cb = new Uint8Array(4 + data.length); cb.set(tb, 0); cb.set(data, 4);
  dv.setUint32(8 + data.length, crc32(cb));
  return chunk;
}
function blueifyPNG(src: Uint8Array): Uint8Array {
  try {
    const MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) if (src[i] !== MAGIC[i]) return src;

    let off = 8, width = 0, height = 0, bitDepth = 8, colorType = 6;
    const idatParts: Uint8Array[] = [];
    while (off + 12 <= src.length) {
      const len = u32(src, off);
      const type = String.fromCharCode(src[off+4], src[off+5], src[off+6], src[off+7]);
      const data = src.slice(off + 8, off + 8 + len);
      off += 12 + len;
      if (type === "IHDR") { width = u32(data, 0); height = u32(data, 4); bitDepth = data[8]; colorType = data[9]; }
      else if (type === "IDAT") idatParts.push(data);
      else if (type === "IEND") break;
    }
    if (bitDepth !== 8 || !width) return src;
    const ch = [0, 0, 3, 0, 2, 0, 4][colorType] || 0;
    if (!ch) return src;

    const compBuf = new Uint8Array(idatParts.reduce((s, p) => s + p.length, 0));
    let p2 = 0; for (const p of idatParts) { compBuf.set(p, p2); p2 += p.length; }

    const raw = inflateZ(compBuf);
    const stride = width * ch;
    const pixels = new Uint8Array(height * stride);

    for (let row = 0; row < height; row++) {
      const rowOff = row * (stride + 1);
      const f = raw[rowOff];
      const s2 = raw.subarray(rowOff + 1, rowOff + 1 + stride);
      const dst = pixels.subarray(row * stride, (row + 1) * stride);
      const prev = row > 0 ? pixels.subarray((row - 1) * stride, row * stride) : new Uint8Array(stride);
      for (let i = 0; i < stride; i++) {
        const a = i >= ch ? dst[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
        switch (f) {
          case 0: dst[i] = s2[i]; break;
          case 1: dst[i] = (s2[i] + a) & 0xFF; break;
          case 2: dst[i] = (s2[i] + b) & 0xFF; break;
          case 3: dst[i] = (s2[i] + Math.floor((a + b) / 2)) & 0xFF; break;
          case 4: dst[i] = (s2[i] + paeth(a, b, c)) & 0xFF; break;
          default: dst[i] = s2[i];
        }
      }
    }

    const out = new Uint8Array(pixels.length);
    for (let i = 0; i < width * height; i++) {
      const b2 = i * ch;
      let pr = 0, pg = 0, pb = 0, pa = 255;
      if (ch === 1) { pr = pg = pb = pixels[b2]; }
      else if (ch === 2) { pr = pg = pb = pixels[b2]; pa = pixels[b2 + 1]; }
      else if (ch === 3) { pr = pixels[b2]; pg = pixels[b2+1]; pb = pixels[b2+2]; }
      else { pr = pixels[b2]; pg = pixels[b2+1]; pb = pixels[b2+2]; pa = pixels[b2+3]; }
      const lum = (pr + pg + pb) / 3;

      if (pa < 15 || lum > 215) {
        if (ch >= 4) { out[b2] = 255; out[b2+1] = 255; out[b2+2] = 255; out[b2+3] = 0; }
        else if (ch === 3) { out[b2] = 255; out[b2+1] = 255; out[b2+2] = 255; }
        else if (ch === 2) { out[b2] = 255; out[b2+1] = 0; }
        else out[b2] = 255;
      } else {
        const t = Math.max(0, Math.min(1, lum / 160));
        const nr = Math.round(15 + (pr - 15) * t);
        const ng = Math.round(45 + (pg - 45) * t);
        const nb = Math.round(165 + (pb - 165) * t);
        const na = Math.round(pa * (1 - t * 0.25));
        if (ch >= 4) { out[b2] = nr; out[b2+1] = ng; out[b2+2] = nb; out[b2+3] = na; }
        else if (ch === 3) { out[b2] = nr; out[b2+1] = ng; out[b2+2] = nb; }
        else if (ch === 2) { out[b2] = Math.round((nr+ng+nb)/3); out[b2+1] = na; }
        else out[b2] = Math.round((nr+ng+nb)/3);
      }
    }

    const filtered = new Uint8Array(height * (stride + 1));
    for (let row = 0; row < height; row++) {
      filtered[row * (stride + 1)] = 0;
      filtered.set(out.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
    }
    const compIdat = deflateZ(filtered);

    const ihdrBuf = new Uint8Array(13);
    const dv3 = new DataView(ihdrBuf.buffer);
    dv3.setUint32(0, width); dv3.setUint32(4, height);
    ihdrBuf[8] = bitDepth; ihdrBuf[9] = colorType;

    const chunks = [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk("IHDR", ihdrBuf),
      pngChunk("IDAT", compIdat),
      pngChunk("IEND", new Uint8Array(0)),
    ];
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const png = new Uint8Array(total);
    let pos3 = 0; for (const c of chunks) { png.set(c, pos3); pos3 += c.length; }
    return png;
  } catch (e) {
    console.error("blueifyPNG failed:", e);
    return src;
  }
}

// ── Main ──────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { contract_id, reservation_id } = await req.json();
    if (!contract_id || !reservation_id) {
      return new Response(JSON.stringify({ error: "contract_id and reservation_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts").select("*").eq("id", contract_id).maybeSingle();
    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fully-signed sealed contracts are immutable — return existing PDF.
    if (contract.locked === true && contract.pdf_storage_path) {
      return new Response(JSON.stringify({
        pdf_storage_path: contract.pdf_storage_path,
        content_hash: contract.content_hash,
        already_sealed: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch all data ─────────────────────────────────────────
    const { data: reservation } = await supabase
      .from("reservations").select("*, guests(*)").eq("id", reservation_id).maybeSingle();
    const propId = reservation?.property_id || contract.property_id;
    const { data: property } = propId
      ? await supabase.from("properties").select("*").eq("id", propId).maybeSingle()
      : { data: null };
    const { data: host } = property?.host_id
      ? await supabase.from("hosts").select("*").eq("id", property.host_id).maybeSingle()
      : { data: null };
    const { data: auditLogs } = await supabase
      .from("signature_audit_log").select("*")
      .eq("reservation_id", reservation_id).order("created_at", { ascending: true });
    const { data: kyc } = await supabase
      .from("identity_verification").select("*")
      .eq("reservation_id", reservation_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const contractContent = contract.contract_content || "Contrat sans contenu";
    const contentHash = await sha256(
      contractContent + (contract.host_signature_url || "") +
      (contract.guest_signature_url || "") + (contract.signed_at || ""),
    );

    // ── Data preparation ───────────────────────────────────────
    const guestName    = reservation?.guests?.full_name || "Non renseigné";
    const guestEmail   = reservation?.guests?.email || "Non renseigné";
    const guestPhone   = reservation?.guests?.phone || "";
    const propName     = property?.name || "Non renseigné";
    const propAddr     = property ? `${property.address}, ${property.city}` : "Non renseigné";
    const propCountry  = property?.country || "";
    const checkIn      = reservation?.check_in_date
      ? new Date(reservation.check_in_date).toLocaleDateString("fr-FR") : "Non renseigné";
    const checkOut     = reservation?.check_out_date
      ? new Date(reservation.check_out_date).toLocaleDateString("fr-FR") : "Non renseigné";
    const checkInTime  = property?.check_in_time || "15:00";
    const checkOutTime = property?.check_out_time || "11:00";
    const nbGuests     = String(reservation?.number_of_guests || "Non renseigné");
    const bookRef      = reservation?.booking_reference || "Non renseigné";
    const signedAtRaw  = contract.signed_at ? new Date(contract.signed_at) : null;
    const signedAt     = signedAtRaw ? signedAtRaw.toLocaleString("fr-FR") : null;
    const hostSignedAt = contract.signed_by_host && contract.updated_at
      ? new Date(contract.updated_at).toLocaleString("fr-FR") : null;

    const hostName     = host?.full_name || host?.company_name || "Bailleur";
    const hostCompany  = host?.company_name || "";
    const hostEmail    = host?.email || "";
    const hostPhone    = host?.phone || "";

    // Guest device info pulled from latest audit entry of signer_role 'guest'
    const guestAudit = (auditLogs || []).filter((a) => a.signer_role === "guest").slice(-1)[0];
    const guestIP = (guestAudit?.ip_address || "").split(",")[0].trim() || "Inconnue";
    const guestUA = guestAudit?.user_agent || "";
    const guestDev = deviceFromUA(guestUA);

    const idType = idTypeLabel(kyc?.id_type);
    const kycStatusFr = kycStatusLabel(kyc?.status);
    const kycConfidence = kyc?.document_confidence != null
      ? `${Math.round(Number(kyc.document_confidence) * 100)} %`
      : null;

    // ── Business logic for signature status ────────────────────
    // The host's act of issuing/sharing the verification link is itself the
    // host's expression of consent. We therefore consider the contract fully
    // accepted as soon as the guest has signed — no separate "host signature"
    // is required by the workflow. We keep `bothSigned` as a strict legacy
    // indicator (true only when the host has also explicitly signed), but the
    // visual states use `contractAccepted` instead so we never give the
    // misleading impression that a host signature is missing.
    const bothSigned = contract.signed_by_guest === true && contract.signed_by_host === true;
    const contractAccepted = contract.signed_by_guest === true;
    const hostIssuedAt = contract.created_at
      ? new Date(contract.created_at).toLocaleString("fr-FR")
      : null;

    // ── PDF setup ──────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontI = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontM = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontMB = await pdfDoc.embedFont(StandardFonts.CourierBold);
    // Slightly more generous margins → premium feel + improved line measure.
    const PW = 595, PH = 842, M = 50, CW = PW - M * 2;
    const FOOTER_RESERVED = 52;  // space to keep clear for footer

    // page-local state — we build content first, then paginate footers at end
    let page = pdfDoc.addPage([PW, PH]);
    let y = PH - M;

    // ── Drawing helpers ─────────────────────────────────────────
    // deno-lint-ignore no-explicit-any
    const T = (t: string, x: number, ty: number, sz: number, f: any, col: any) =>
      page.drawText(clean(t), { x, y: ty, size: sz, font: f, color: col });

    const Tw = (t: string, sz: number, f: typeof font) => f.widthOfTextAtSize(clean(t), sz);

    // Truncate `text` to fit within `maxW` at `sz` for font `f`, appending "..."
    // when necessary. Always returns a cleaned string. Never overflows.
    const truncateToWidth = (text: string, maxW: number, sz: number, f: typeof font) => {
      const c = clean(text);
      if (Tw(c, sz, f) <= maxW) return c;
      const ell = "...";
      const ellW = f.widthOfTextAtSize(ell, sz);
      let out = c;
      while (out.length > 1 && f.widthOfTextAtSize(out, sz) + ellW > maxW) {
        out = out.slice(0, -1);
      }
      return out.replace(/\s+$/, "") + ell;
    };

    // Wrap a long monospace string (typically the SHA-256 hash) into N lines
    // that strictly fit the available width.
    const wrapMono = (s: string, maxW: number, sz: number, f: typeof font): string[] => {
      const out: string[] = [];
      const cw = f.widthOfTextAtSize("0", sz);
      const perLine = Math.max(1, Math.floor(maxW / cw));
      for (let i = 0; i < s.length; i += perLine) out.push(s.slice(i, i + perLine));
      return out;
    };

    // deno-lint-ignore no-explicit-any
    const R = (x: number, topY: number, w: number, h: number, fill: any, border?: any, bw = 0.6) =>
      page.drawRectangle({ x, y: topY - h, width: w, height: h, color: fill,
        ...(border ? { borderColor: border, borderWidth: bw } : {}) });

    const HL = (ty: number, x = M, w = CW, thick = 0.5, col = GRAY_3) =>
      page.drawLine({ start: { x, y: ty }, end: { x: x + w, y: ty }, thickness: thick, color: col });

    const ensureSpace = (needed: number) => {
      if (y - needed < M + FOOTER_RESERVED) {
        page = pdfDoc.addPage([PW, PH]);
        y = PH - M;
      }
    };

    // Section header — sober: short navy accent bar + uppercase navy title +
    // optional gray subtitle, then a fine hairline divider.
    const sectionHeader = (label: string, subtitle?: string) => {
      ensureSpace(40);
      y -= 12; // breathing room above each section
      const upper = clean(label.toUpperCase());
      R(M, y - 1, 2.5, 12, NAVY);
      T(upper, M + 10, y - 9, 9.5, fontB, NAVY);
      if (subtitle) {
        const sx = M + 10 + Tw(upper, 9.5, fontB) + 10;
        T(subtitle, sx, y - 9, 8.5, font, GRAY_2);
      }
      y -= 18;
      HL(y, M, CW, 0.4, GRAY_3);
      y -= 12;
    };

    // Draw a single text line with optional full justification. Word spacing
    // is expanded so the line fills `w`; last line of a paragraph (and lines
    // with a single word) render flush-left as in CSS `text-align: justify`.
    // deno-lint-ignore no-explicit-any
    const drawJustified = (text: string, x: number, ty: number, w: number, size: number, f: any, col: any, justify: boolean) => {
      const cleaned = clean(text);
      if (!justify || !cleaned.trim()) {
        page.drawText(cleaned, { x, y: ty, size, font: f, color: col });
        return;
      }
      const parts = cleaned.split(" ").filter((s) => s.length > 0);
      if (parts.length < 2) {
        page.drawText(cleaned, { x, y: ty, size, font: f, color: col });
        return;
      }
      const wordsW = parts.reduce((s, p) => s + f.widthOfTextAtSize(p, size), 0);
      const gaps = parts.length - 1;
      const naturalGap = f.widthOfTextAtSize(" ", size);
      const neededGap = (w - wordsW) / gaps;
      // Cap extra spacing so stretched lines don't look grotesque.
      const maxGap = naturalGap * 3.2;
      const gap = Math.max(naturalGap, Math.min(neededGap, maxGap));
      let cx = x;
      for (let i = 0; i < parts.length; i++) {
        page.drawText(parts[i], { x: cx, y: ty, size, font: f, color: col });
        cx += f.widthOfTextAtSize(parts[i], size) + gap;
      }
    };

    // Paragraph renderer — translates the CSS
    //   p { text-align: justify; line-height: 1.6; margin-bottom: 10px; }
    // into pdf-lib calls. Handles page breaks, returns nothing (mutates `y`).
    const drawParagraph = (
      text: string,
      opts: {
        x?: number;
        width?: number;
        size?: number;
        // deno-lint-ignore no-explicit-any
        font?: any;
        // deno-lint-ignore no-explicit-any
        color?: any;
        lineHeight?: number;   // multiplier, CSS-style; defaults to 1.6
        marginBottom?: number; // pt
        justify?: boolean;
      } = {},
    ) => {
      const x = opts.x ?? M;
      const w = opts.width ?? CW;
      const sz = opts.size ?? 9;
      const f = opts.font ?? font;
      const col = opts.color ?? INK;
      const lh = opts.lineHeight ?? 1.6;
      const mb = opts.marginBottom ?? 10;
      const justify = opts.justify ?? true;
      const step = sz * lh;

      const lines = wrapByWidth(text, w, sz, f);
      for (const ln of lines) {
        if (ln.blank) { y -= step * 0.5; continue; }
        ensureSpace(step);
        drawJustified(ln.text, x, y - sz, w, sz, f, col, justify && !ln.lastOfPara);
        y -= step;
      }
      y -= mb;
    };

    // Bulleted list — CSS `ul { margin-left: 20px; line-height: 1.6; }`.
    // Each item wraps with a hanging indent so wrapped lines align under the
    // first word of the item rather than under the bullet.
    const drawBulletList = (
      items: string[],
      opts: {
        x?: number;
        width?: number;
        size?: number;
        // deno-lint-ignore no-explicit-any
        font?: any;
        // deno-lint-ignore no-explicit-any
        color?: any;
        lineHeight?: number;
        marginBottom?: number;
        indent?: number;      // left offset for the bullet (CSS margin-left)
        hang?: number;        // gap between bullet and item text
        justify?: boolean;
      } = {},
    ) => {
      const x = opts.x ?? M;
      const w = opts.width ?? CW;
      const sz = opts.size ?? 9;
      const f = opts.font ?? font;
      const col = opts.color ?? INK;
      const lh = opts.lineHeight ?? 1.6;
      const mb = opts.marginBottom ?? 10;
      const indent = opts.indent ?? 20;
      const hang = opts.hang ?? 8;
      const justify = opts.justify ?? true;
      const step = sz * lh;
      const textX = x + indent + hang;
      const textW = w - indent - hang;

      for (const item of items) {
        const lines = wrapByWidth(item, textW, sz, f);
        ensureSpace(step);
        // Draw a small filled square bullet — CSS list-style-type: square.
        // (Unicode bullets get stripped to '*' by clean() for WinAnsi fonts.)
        const bulletSide = Math.max(2.2, sz * 0.28);
        page.drawRectangle({
          x: x + indent,
          y: y - sz + (sz - bulletSide) / 2 + 1,
          width: bulletSide, height: bulletSide, color: BLUE,
        });
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) ensureSpace(step);
          const ln = lines[i];
          drawJustified(ln.text, textX, y - sz, textW, sz, f, col, justify && !ln.lastOfPara);
          y -= step;
        }
      }
      y -= mb;
    };

    // ─────────────────────────────────────────────────────────
    // HEADER BAND — sober, deep navy, single accent rule, balanced layout
    // ─────────────────────────────────────────────────────────
    const HEADER_H = 90;
    R(0, PH, PW, HEADER_H, NAVY);
    // Very subtle inner gradient feel — a darker band at the bottom
    R(0, PH - HEADER_H + 14, PW, HEADER_H - 14, NAVY_2);
    // Single crisp accent rule at the bottom (discreet orange, not bright blue)
    R(0, PH - HEADER_H + 2, PW, 2, ACCENT);

    // ── Left: title block ──
    const titleY = PH - 38;
    T("CONTRAT DE LOCATION DE COURTE DURÉE",
      M, titleY, 15, fontB, WHITE);
    T("Document électronique — Loi n° 53-05 relative à l'échange électronique de données juridiques",
      M, titleY - 18, 8, font, rgb(0.788, 0.851, 0.929));

    // ── Right: metadata stack ──
    const rHeadX = PW - M;
    const muted = rgb(0.694, 0.776, 0.886);
    // Helper: right-aligned "LABEL  Value" row inside the header.
    const drawHeadRow = (lab: string, val: string, ty: number, valFont: typeof font, sz: number) => {
      const maxValW = 172;
      const fittedVal = truncateToWidth(val, maxValW, sz, valFont);
      const valW = Tw(fittedVal, sz, valFont);
      const labUp = lab.toUpperCase();
      T(fittedVal, rHeadX - valW, ty, sz, valFont, WHITE);
      T(labUp, rHeadX - valW - Tw(labUp, 6.5, fontB) - 10, ty + 0.5, 6.5, fontB, muted);
    };
    const genVal = `${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    drawHeadRow("Réf. réservation", bookRef, PH - 32, fontB, 9.5);
    drawHeadRow("Généré le", genVal, PH - 48, font, 8.5);
    drawHeadRow("Identifiant document", contract_id.slice(0, 8).toUpperCase(), PH - 64, fontMB, 7.5);

    y = PH - HEADER_H - 24;

    // ─────────────────────────────────────────────────────────
    // STATUS PILL — sober, two real states only:
    //   • guest signed → "Contrat émis par le bailleur · signé électroniquement
    //                     par le locataire"  (sober validated tone)
    //   • guest unsigned → "Émis par le bailleur · en attente de signature
    //                       du locataire"   (discreet ochre)
    // No green "two parties signed" claim — only the tenant signs.
    // ─────────────────────────────────────────────────────────
    const statusLabel = contractAccepted
      ? "Contrat émis par le bailleur · signé électroniquement par le locataire"
      : "Émis par le bailleur · en attente de signature du locataire";
    // deno-lint-ignore no-explicit-any
    const statusCol: any = contractAccepted ? SOFT_OK_FG : ACCENT;
    // deno-lint-ignore no-explicit-any
    const statusBg: any  = contractAccepted ? SOFT_OK : ACCENT_L;
    // deno-lint-ignore no-explicit-any
    const statusBd: any  = contractAccepted ? SOFT_OK_BD : ACCENT_M;

    const pillSize = 9;
    const markSide = 5;
    const groupGap = 8;
    const pillTextW = Tw(statusLabel, pillSize, fontB);
    const contentW = markSide + groupGap + pillTextW;
    const pillW = Math.min(CW, contentW + 36);
    const pillH = 24;
    const pillX = (PW - pillW) / 2;
    // Card with subtle border, soft fill
    R(pillX, y, pillW, pillH, statusBg, statusBd, 0.8);
    // Group (mark + text) centred horizontally and vertically
    const contentX = pillX + (pillW - contentW) / 2;
    page.drawRectangle({
      x: contentX,
      y: y - (pillH + markSide) / 2,
      width: markSide, height: markSide, color: statusCol,
    });
    // Label baseline tuned for visual vertical centring in the pill
    T(statusLabel,
      contentX + markSide + groupGap,
      y - (pillH / 2) - (pillSize * 0.72) / 2 + 1,
      pillSize, fontB, statusCol);
    y -= pillH + 8;

    // Sub-line under the pill — italics, gray, never overflows
    let sub = "";
    if (contractAccepted && signedAt) {
      sub = `Signé par le locataire le ${signedAt}  ·  Empreinte SHA-256 : ${contentHash.slice(0, 16)}...`;
    } else if (!contractAccepted && hostIssuedAt) {
      sub = `Contrat émis par le bailleur le ${hostIssuedAt}  ·  Lien de signature transmis au locataire`;
    }
    if (sub) {
      // Truncate gracefully if too wide for the page
      const subSize = 7.5;
      let subShown = sub;
      while (Tw(subShown, subSize, fontI) > CW - 20 && subShown.length > 20) {
        subShown = subShown.slice(0, subShown.length - 2);
      }
      if (subShown !== sub) subShown = subShown.replace(/\.{0,3}$/, "...");
      T(subShown, (PW - Tw(subShown, subSize, fontI)) / 2, y, subSize, fontI, GRAY_1);
      y -= 12;
    }
    y -= 12;

    // ─────────────────────────────────────────────────────────
    // PARTIES CARD
    // ─────────────────────────────────────────────────────────
    sectionHeader("Parties au contrat", "Identification des parties");

    const halfW = Math.floor((CW - 14) / 2);
    const partyH = 124;

    // Compact party card — close to the first-model layout: navy header, name
    // in bold, then "Label : value" rows. Uses the same accent for both roles
    // (the role itself is the differentiator, not the colour).
    const drawPartyCard = (
      x: number,
      roleTag: string,
      person: { name: string; rows: Array<{ k: string; v: string }> },
    ) => {
      R(x, y, halfW, partyH, WHITE, GRAY_3, 0.7);
      R(x, y, halfW, 22, NAVY);
      T(clean(roleTag), x + 12, y - 9, 8.5, fontB, WHITE);

      // Name on its own line, generous breathing room
      let ly = y - 22 - 16;
      const padX = 12;
      const innerW = halfW - padX * 2;
      const nameTrunc = truncateToWidth(person.name, innerW, 11, fontB);
      T(nameTrunc, x + padX, ly, 11, fontB, INK);
      ly -= 16;

      // Stacked label/value rows — keys inline, sober and aligned
      for (const r of person.rows) {
        const k = clean(r.k + " :");
        const kw = Tw(k, 7.5, font);
        T(k, x + padX, ly, 7.5, font, GRAY_2);
        const valMaxW = innerW - kw - 6;
        const v = truncateToWidth(r.v, valMaxW, 8.5, font);
        T(v, x + padX + kw + 6, ly, 8.5, font, INK);
        ly -= 13;
      }
    };

    const hostRows: Array<{ k: string; v: string }> = [];
    if (hostCompany && hostCompany !== hostName) hostRows.push({ k: "Société", v: hostCompany });
    if (hostEmail) hostRows.push({ k: "Email", v: hostEmail });
    if (hostPhone) hostRows.push({ k: "Téléphone", v: hostPhone });
    hostRows.push({ k: "Rôle", v: "Bailleur / Hôte (émetteur du contrat)" });

    const guestRows: Array<{ k: string; v: string }> = [];
    if (guestEmail && guestEmail !== "Non renseigné") guestRows.push({ k: "Email", v: guestEmail });
    if (guestPhone) guestRows.push({ k: "Téléphone", v: guestPhone });
    guestRows.push({ k: "Rôle", v: "Locataire / Voyageur (signataire)" });
    guestRows.push({ k: "Pièce d'identité", v: idType });

    drawPartyCard(M, "BAILLEUR (HÔTE)", { name: hostName, rows: hostRows });
    drawPartyCard(M + halfW + 14, "LOCATAIRE (INVITÉ)", { name: guestName, rows: guestRows });
    y -= partyH + 18;

    // ─────────────────────────────────────────────────────────
    // PROPERTY & RESERVATION CARD
    // ─────────────────────────────────────────────────────────
    sectionHeader("Bien et séjour", "Détails de la location");

    const propertyH = 110;
    // Sober blue-tinted card, hairline border, no top stripe (kept clean).
    R(M, y, CW, propertyH, BLUE_SOFT, BLUE_M, 0.6);
    const topY = y;
    const colSplit = M + CW / 2;
    const col1X = M + 14;
    const col2X = colSplit + 14;
    const col1Inner = CW / 2 - 28;
    const col2Inner = CW / 2 - 28;

    // LEFT: Propriété
    T("PROPRIÉTÉ", col1X, topY - 16, 7.5, fontB, NAVY);
    const pnFit = truncateToWidth(propName, col1Inner, 11, fontB);
    T(pnFit, col1X, topY - 32, 11, fontB, INK);
    const addrFit = truncateToWidth(propAddr, col1Inner, 8.5, font);
    T(addrFit, col1X, topY - 47, 8.5, font, GRAY_1);
    if (propCountry) {
      T(truncateToWidth(propCountry, col1Inner, 8, font), col1X, topY - 60, 8, font, GRAY_2);
    }
    if (property?.rooms_count || property?.max_guests) {
      const propMeta = `${property?.rooms_count ?? "?"} chambre(s)  ·  Capacité max. ${property?.max_guests ?? "?"} personne(s)`;
      T(truncateToWidth(propMeta, col1Inner, 7.5, font), col1X, topY - 84, 7.5, font, GRAY_1);
    }

    // Vertical separator
    page.drawLine({
      start: { x: colSplit, y: topY - 12 },
      end:   { x: colSplit, y: topY - propertyH + 12 },
      thickness: 0.5, color: BLUE_M,
    });

    // RIGHT: Séjour
    T("SÉJOUR", col2X, topY - 16, 7.5, fontB, NAVY);
    const resLines: Array<[string, string]> = [
      ["Référence", bookRef],
      ["Arrivée",   `${checkIn} à ${checkInTime}`],
      ["Départ",    `${checkOut} à ${checkOutTime}`],
      ["Voyageurs", `${nbGuests} personne(s)`],
    ];
    let rly = topY - 34;
    for (const [k, v] of resLines) {
      T(k, col2X, rly, 7.5, font, GRAY_2);
      const valX = col2X + 64;
      const valW = col2Inner - 64;
      T(truncateToWidth(v, valW, 9, fontB), valX, rly, 9, fontB, INK);
      rly -= 14;
    }
    y -= propertyH + 18;

    // ─────────────────────────────────────────────────────────
    // CONTRACT BODY  —  .contract-block { text-align: justify; }
    //                   p { line-height: 1.6; margin-bottom: 10px; }
    // ─────────────────────────────────────────────────────────
    sectionHeader("Termes du contrat", "Clauses contractuelles convenues");
    y -= 4;

    // Split the template on BLANK lines → each block is one paragraph. Within
    // a block, newlines are soft (joined with a space) so wrapByWidth can
    // re-flow the text to the page width with proper justification.
    const rawBlocks = contractContent.split(/\n\s*\n/);
    for (let rb = 0; rb < rawBlocks.length; rb++) {
      const blockRaw = rawBlocks[rb];
      const block = blockRaw.replace(/\n/g, " ").trim();
      if (!block) { y -= 6; continue; }

      // Horizontal rule marker
      if (/^---+$/.test(block) || /^--+$/.test(block)) {
        ensureSpace(14);
        HL(y, M + 30, CW - 60, 0.4, GRAY_3);
        y -= 12;
        continue;
      }

      const isArticle  = /^(article|art\.?)\s*\d+/i.test(block);
      const numMatch   = block.match(/^(\d+)[.)]\s+(.*)$/);
      const isNumbered = !!numMatch;
      const isHeading  = /^[A-Z0-9\s\-:]{6,}$/.test(block) && block.length < 80;
      const isBullet   = /^\s*[-*•]\s+/.test(blockRaw) && blockRaw.includes("\n");

      if (isArticle) {
        // Article N. — Title on its own line, then the body (if any) after a colon.
        ensureSpace(28);
        y -= 8;
        R(M, y + 1, 3, 14, BLUE);
        const colonIdx = block.indexOf(":");
        if (colonIdx > 0 && colonIdx < 80) {
          const head = block.slice(0, colonIdx + 1).trim();
          const tail = block.slice(colonIdx + 1).trim();
          T(head, M + 11, y - 10, 10.5, fontB, NAVY);
          y -= 20;
          if (tail) drawParagraph(tail, { size: 9.5, marginBottom: 12 });
          else y -= 4;
        } else {
          T(block, M + 11, y - 10, 10.5, fontB, NAVY);
          y -= 20;
        }
      } else if (isHeading) {
        ensureSpace(28);
        y -= 6;
        T(block, M, y - 10, 11, fontB, NAVY);
        // tiny accent rule under the heading
        page.drawLine({
          start: { x: M, y: y - 14 }, end: { x: M + 36, y: y - 14 },
          thickness: 1.2, color: BLUE,
        });
        y -= 22;
      } else if (isBullet) {
        // A block that contains multiple bullet lines → render as a list.
        const items = blockRaw
          .split(/\n/)
          .map((l) => l.replace(/^\s*[-*•]\s+/, "").trim())
          .filter((l) => l.length > 0);
        drawBulletList(items, { size: 9.5, lineHeight: 1.6, indent: 18, marginBottom: 12 });
      } else if (isNumbered && numMatch) {
        // "1. Parties contractantes" → small navy numeral + bold navy title on
        // a single baseline, then the body justified below at full width.
        // Sober premium look — close to a printed contract.
        const numStr = numMatch[1];
        const rest = numMatch[2];
        const colonIdx = rest.indexOf(":");
        let title = rest;
        let body = "";
        if (colonIdx > 0 && colonIdx < 60) {
          title = rest.slice(0, colonIdx).trim();
          body = rest.slice(colonIdx + 1).trim();
        }
        ensureSpace(28);
        y -= 8;
        const headLine = `${numStr}.  ${title}`;
        const headFit = truncateToWidth(headLine, CW, 10.5, fontB);
        T(headFit, M, y - 10, 10.5, fontB, NAVY);
        y -= 18;
        if (body) {
          drawParagraph(body, {
            x: M, width: CW,
            size: 9.5, lineHeight: 1.6, marginBottom: 12, justify: true,
          });
        } else {
          y -= 4;
        }
      } else {
        drawParagraph(block, {
          size: 9.5, lineHeight: 1.6, marginBottom: 12, justify: true,
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // ELECTRONIC SIGNATURE CLAUSE  —  Moroccan Law 53-05
    // ─────────────────────────────────────────────────────────
    ensureSpace(140);
    sectionHeader("Signature électronique", "Clause juridique — Loi n° 53-05");

    drawParagraph(
      "Les parties reconnaissent expressément que la signature électronique apposée sur le présent contrat a, conformément à la loi marocaine n° 53-05 du 30 novembre 2007 relative à l'échange électronique de données juridiques, la même valeur juridique qu'une signature manuscrite. Le bailleur exprime son consentement par l'émission et la transmission du présent contrat au locataire, et le locataire exprime le sien par la signature électronique apposée à l'issue de la procédure de vérification d'identité.",
      { size: 9.5, lineHeight: 1.6, marginBottom: 10, justify: true },
    );

    drawBulletList(
      [
        "L'identité du locataire est vérifiée par analyse automatisée de sa pièce d'identité officielle avant la signature du contrat.",
        "L'horodatage du système, l'adresse IP et l'empreinte du terminal utilisé par le signataire sont enregistrés dans une piste d'audit sécurisée afin d'établir la preuve probante de l'acte.",
        "L'intégrité du document signé est garantie par une empreinte cryptographique SHA-256 calculée sur l'ensemble du contenu du contrat et des éléments de signature. Toute modification ultérieure rompt cette empreinte et rend le document non opposable.",
        "Le consentement électronique du locataire est exprimé par la coche explicite et la signature manuscrite numérique apposée après lecture complète du présent contrat.",
      ],
      { size: 9.5, lineHeight: 1.6, indent: 18, marginBottom: 12, justify: true },
    );

    // ─────────────────────────────────────────────────────────
    // SIGNATURE PANELS — sober, certificate feel.
    // Tenant: electronic signature + KYC details.
    // Host:   "Contrat émis" — consent materialised by emission.
    // No status badges, no big stamps; the visual weight stays balanced.
    // ─────────────────────────────────────────────────────────
    ensureSpace(220);
    sectionHeader("Signatures et consentements", "Preuve électronique — Loi n° 53-05");

    const sigBoxW = Math.floor((CW - 14) / 2);
    const sigBoxH = 196;
    ensureSpace(sigBoxH + 16);
    const sigY = y;
    const padX = 14;

    // Shared label/value row inside a panel — strict width budget, no overflow.
    const drawDetailRow = (k: string, v: string, x: number, ty: number, innerW: number) => {
      const kFit = clean(k);
      T(kFit, x, ty, 6.5, fontB, GRAY_2);
      const kw = Tw(kFit, 6.5, fontB);
      const valW = innerW - kw - 8;
      const vFit = truncateToWidth(v, valW, 7.5, font);
      T(vFit, x + kw + 8, ty, 7.5, font, INK);
    };

    // ── LOCATAIRE — electronic signature ────────────────────────
    const drawTenantPanel = async (panelX: number) => {
      const innerW = sigBoxW - padX * 2;
      // Card
      R(panelX, sigY, sigBoxW, sigBoxH, WHITE, GRAY_3, 0.7);
      R(panelX, sigY, sigBoxW, 24, NAVY);
      T("LOCATAIRE", panelX + padX, sigY - 9, 8.5, fontB, WHITE);
      T("Signataire électronique", panelX + padX + Tw("LOCATAIRE", 8.5, fontB) + 10, sigY - 9, 7.5, font, rgb(0.788, 0.851, 0.929));

      // Name + signature date
      const nm = truncateToWidth(guestName, innerW, 11, fontB);
      T(nm, panelX + padX, sigY - 40, 11, fontB, INK);
      if (signedAt) {
        T(`Signé le ${signedAt}`, panelX + padX, sigY - 52, 7.5, font, GRAY_1);
      } else {
        T("Signature en attente", panelX + padX, sigY - 52, 7.5, fontI, GRAY_2);
      }

      // Signature image area
      const imgTop = sigY - 60;
      const imgH = 54;
      R(panelX + padX, imgTop, innerW, imgH, rgb(0.984, 0.988, 0.996), GRAY_4, 0.5);

      const sigDataUrl = contract.guest_signature_url;
      if (sigDataUrl && sigDataUrl.startsWith("data:")) {
        const b64m = sigDataUrl.match(/base64,(.+)$/);
        if (b64m) {
          try {
            const isPng = sigDataUrl.includes("image/png");
            let sigBytes = Uint8Array.from(atob(b64m[1]), (c) => c.charCodeAt(0));
            if (isPng) sigBytes = blueifyPNG(sigBytes);
            const sigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
            const maxW = innerW - 8, maxH = imgH - 6;
            const scale = Math.min(maxW / sigImg.width, maxH / sigImg.height, 1);
            const sw = sigImg.width * scale, sh = sigImg.height * scale;
            const imgX = panelX + (sigBoxW - sw) / 2;
            const imgY = imgTop - (imgH - sh) / 2 - sh;
            page.drawImage(sigImg, { x: imgX, y: imgY, width: sw, height: sh });
          } catch (e) {
            console.error("sig embed error:", e);
            T("[Signature enregistrée]", panelX + padX + 4, imgTop - imgH / 2 - 2, 8, fontI, GRAY_2);
          }
        }
      } else {
        const pt = "Signature non encore apposée";
        T(pt, panelX + (sigBoxW - Tw(pt, 9, fontI)) / 2, imgTop - imgH / 2 + 2, 9, fontI, GRAY_2);
      }

      // Hairline above details
      page.drawLine({
        start: { x: panelX + padX, y: imgTop - imgH - 6 },
        end:   { x: panelX + sigBoxW - padX, y: imgTop - imgH - 6 },
        thickness: 0.4, color: GRAY_3,
      });

      // Detail grid
      let dy = imgTop - imgH - 16;
      const kycLine = kycConfidence ? `${kycStatusFr} (${kycConfidence})` : kycStatusFr;
      const rows: Array<[string, string]> = [
        ["Identité",   kycLine],
        ["Document",   idType],
        ["Adresse IP", guestIP],
        ["Appareil",   guestDev.device],
        ["Navigateur", guestDev.browser === "Inconnu" ? "—" : `${guestDev.browser} — ${guestDev.os}`],
      ];
      for (const [k, v] of rows) {
        if (dy < sigY - sigBoxH + 8) break;
        drawDetailRow(k, v, panelX + padX, dy, innerW);
        dy -= 10;
      }
    };

    // ── BAILLEUR — issuer / consent by emission ────────────────
    const drawHostPanel = (panelX: number) => {
      const innerW = sigBoxW - padX * 2;
      R(panelX, sigY, sigBoxW, sigBoxH, WHITE, GRAY_3, 0.7);
      R(panelX, sigY, sigBoxW, 24, NAVY);
      T("BAILLEUR", panelX + padX, sigY - 9, 8.5, fontB, WHITE);
      T("Émetteur du contrat", panelX + padX + Tw("BAILLEUR", 8.5, fontB) + 10, sigY - 9, 7.5, font, rgb(0.788, 0.851, 0.929));

      const nm = truncateToWidth(hostName, innerW, 11, fontB);
      T(nm, panelX + padX, sigY - 40, 11, fontB, INK);
      if (hostIssuedAt) {
        T(`Contrat émis le ${hostIssuedAt}`, panelX + padX, sigY - 52, 7.5, font, GRAY_1);
      }

      // "Consent by emission" panel — mirrors the signature image area on the
      // tenant side. Sober: very light gray-green tint, hairline border, no
      // bright stamp.
      const noteTop = sigY - 60;
      const noteH = 54;
      R(panelX + padX, noteTop, innerW, noteH, SOFT_OK, SOFT_OK_BD, 0.5);
      // Two-line note, vertically centred
      const noteL1 = "Consentement matérialisé";
      const noteL2 = "par l'émission du contrat";
      const noteL3 = "Lien de signature transmis au locataire";
      const ny = noteTop - 18;
      T(noteL1, panelX + (sigBoxW - Tw(noteL1, 9, fontB)) / 2, ny, 9, fontB, SOFT_OK_FG);
      T(noteL2, panelX + (sigBoxW - Tw(noteL2, 9, fontB)) / 2, ny - 12, 9, fontB, SOFT_OK_FG);
      T(noteL3, panelX + (sigBoxW - Tw(noteL3, 7, fontI)) / 2, ny - 26, 7, fontI, GRAY_1);

      // Hairline above details
      page.drawLine({
        start: { x: panelX + padX, y: noteTop - noteH - 6 },
        end:   { x: panelX + sigBoxW - padX, y: noteTop - noteH - 6 },
        thickness: 0.4, color: GRAY_3,
      });

      // Detail grid
      let dy = noteTop - noteH - 16;
      const rows: Array<[string, string]> = [
        ["Rôle",        "Bailleur / Hôte"],
        ["Email",       hostEmail || "—"],
        ["Téléphone",   hostPhone || "—"],
        ["Base légale", "Loi 53-05 — art. 417-1 et s. du DOC"],
        ["Forme",       "Émission via HostCheckIn"],
      ];
      for (const [k, v] of rows) {
        if (dy < sigY - sigBoxH + 8) break;
        drawDetailRow(k, v, panelX + padX, dy, innerW);
        dy -= 10;
      }
    };

    await drawTenantPanel(M);
    drawHostPanel(M + sigBoxW + 14);

    y = sigY - sigBoxH - 22;

    // ─────────────────────────────────────────────────────────
    // PROOF BLOCK — binds signature to document
    // ─────────────────────────────────────────────────────────
    // Compute proof box geometry first so the SHA-256 hash never overflows.
    const proofPadX = 16;
    const pLeft = M + proofPadX;
    const proofInnerW = CW - proofPadX * 2;
    const hashLines = wrapMono(contentHash, proofInnerW, 7.5, fontMB);
    const proofBoxH = 78 + Math.max(0, hashLines.length - 1) * 11;

    ensureSpace(proofBoxH + 30);
    sectionHeader("Traçabilité du document", "Empreinte cryptographique — lien signature / contenu");

    R(M, y, CW, proofBoxH, GRAY_BG, GRAY_3, 0.6);
    // Left navy accent bar (sober)
    R(M, y, 2.5, proofBoxH, NAVY);

    let py = y - 16;

    // Two-column key facts
    const drawFact = (label: string, value: string, x: number, ty: number, maxW: number, valBold = true) => {
      T(label.toUpperCase(), x, ty, 6.5, fontB, GRAY_2);
      const v = truncateToWidth(value, maxW, 8.5, valBold ? fontB : font);
      T(v, x, ty - 10, 8.5, valBold ? fontB : font, INK);
    };

    const colW = (proofInnerW - 16) / 2;
    drawFact("Date de signature", signedAt || "—", pLeft, py, colW);
    drawFact("Signataire", guestName, pLeft + colW + 16, py, colW);
    drawFact("Document présenté", idType, pLeft, py - 28, colW);
    const kycFact = kycConfidence ? `${kycStatusFr} (${kycConfidence})` : kycStatusFr;
    drawFact("Statut d'identité", kycFact, pLeft + colW + 16, py - 28, colW);

    // SHA-256 row, full width, monospace, wrapped to fit
    py -= 52;
    T("EMPREINTE CRYPTOGRAPHIQUE SHA-256", pLeft, py, 6.5, fontB, GRAY_2);
    let hy = py - 11;
    for (const line of hashLines) {
      T(line, pLeft, hy, 7.5, fontMB, NAVY);
      hy -= 11;
    }

    y -= proofBoxH + 14;
    ensureSpace(14);
    drawParagraph(
      "Cette empreinte unique scelle le contrat et son contexte de signature. Toute modification ultérieure la rompt.",
      { size: 7.2, lineHeight: 1.5, marginBottom: 6, color: GRAY_1, font: fontI, justify: false },
    );

    // ─────────────────────────────────────────────────────────
    // AUDIT TRAIL — refined table, alternating rows, comfortable padding
    // ─────────────────────────────────────────────────────────
    ensureSpace(110);
    sectionHeader("Piste d'audit", "Journal chronologique des événements");

    // Table column geometry — proportional to content width
    const colX = [M + 12, M + 124, M + 254, M + 314, M + 416];
    const colMaxW = [108, 126, 56, 98, M + CW - 12 - (M + 416)];
    const rowH = 18;
    const headH = 22;

    // Header (sober navy)
    R(M, y, CW, headH, NAVY);
    T("HORODATAGE", colX[0], y - 9, 7, fontB, WHITE);
    T("ÉVÉNEMENT", colX[1], y - 9, 7, fontB, WHITE);
    T("RÔLE", colX[2], y - 9, 7, fontB, WHITE);
    T("ADRESSE IP", colX[3], y - 9, 7, fontB, WHITE);
    T("DÉTAIL", colX[4], y - 9, 7, fontB, WHITE);
    y -= headH;

    const eventLabel = (e: string): string => {
      switch (e) {
        case "identity_submitted": return "Pièce d'identité soumise";
        case "identity_verification_processed": return "Vérification d'identité traitée";
        case "contract_viewed": return "Contrat consulté";
        case "consent_given": return "Consentement exprimé";
        case "contract_signed": return "Signature électronique du locataire apposée";
        case "pdf_generated": return "Document PDF généré et scellé";
        case "host_signed": return "Consentement du bailleur matérialisé";
        case "pdf_downloaded": return "Document PDF téléchargé";
        default: return e;
      }
    };
    const roleLabel = (r?: string | null): string => {
      switch ((r || "").toLowerCase()) {
        case "guest": return "Locataire";
        case "host": return "Bailleur";
        case "system": return "Système";
        default: return r || "—";
      }
    };

    const logs = auditLogs || [];
    if (logs.length === 0) {
      ensureSpace(rowH);
      R(M, y, CW, rowH, WHITE, GRAY_3, 0.3);
      T("Aucun événement enregistré.", colX[0], y - 12, 7.5, fontI, GRAY_2);
      y -= rowH;
    } else {
      let altRow = false;
      for (const entry of logs) {
        ensureSpace(rowH + 2);
        const ts = (entry.created_at || "").slice(0, 19).replace("T", " ");
        const ev = eventLabel(entry.event_type || "");
        const role = roleLabel(entry.signer_role);
        const ip = (entry.ip_address || "").split(",")[0].trim() || "—";
        const detail = entry.signer_email || (entry.metadata?.id_type || "") || "";
        // Row background
        R(M, y, CW, rowH, altRow ? GRAY_BG2 : WHITE);
        // Hairline between rows
        page.drawLine({
          start: { x: M, y: y - rowH }, end: { x: M + CW, y: y - rowH },
          thickness: 0.25, color: GRAY_3,
        });
        T(truncateToWidth(ts,     colMaxW[0], 6.8, fontM), colX[0], y - 12, 6.8, fontM, INK);
        T(truncateToWidth(ev,     colMaxW[1], 7,   font),  colX[1], y - 12, 7,   font,  INK);
        T(truncateToWidth(role,   colMaxW[2], 7,   font),  colX[2], y - 12, 7,   font,  GRAY_1);
        T(truncateToWidth(ip,     colMaxW[3], 6.8, fontM), colX[3], y - 12, 6.8, fontM, GRAY_1);
        T(truncateToWidth(detail || "—", colMaxW[4], 6.8, font),  colX[4], y - 12, 6.8, font,  GRAY_1);
        y -= rowH;
        altRow = !altRow;
      }
      // Bottom border
      page.drawLine({
        start: { x: M, y }, end: { x: M + CW, y },
        thickness: 0.6, color: GRAY_3,
      });
    }
    y -= 18;

    // ─────────────────────────────────────────────────────────
    // Legal reminder paragraph — justified, 1.6 line-height.
    // ─────────────────────────────────────────────────────────
    ensureSpace(42);
    HL(y, M, CW, 0.4, GRAY_3);
    y -= 12;
    drawParagraph(
      "Document généré électroniquement conformément à la loi marocaine n° 53-05 du 30 novembre 2007 relative à l'échange électronique de données juridiques. La signature électronique du locataire a la même valeur juridique qu'une signature manuscrite (art. 417-1 et suivants du Dahir des obligations et des contrats). Le consentement du bailleur est matérialisé par l'émission du contrat.",
      { size: 7.8, lineHeight: 1.6, marginBottom: 4, justify: true, color: GRAY_1 },
    );

    // ─────────────────────────────────────────────────────────
    // FOOTER on every page — Page X / Y
    // ─────────────────────────────────────────────────────────
    const total = pdfDoc.getPageCount();
    for (let i = 0; i < total; i++) {
      const p = pdfDoc.getPage(i);
      // Top hairline + 1.2pt blue accent above it for premium feel
      p.drawLine({
        start: { x: M, y: M + 30 }, end: { x: PW - M, y: M + 30 },
        thickness: 0.4, color: GRAY_3,
      });
      // Tiny discreet orange accent square on the left edge
      p.drawRectangle({ x: M, y: M + 12, width: 2.5, height: 2.5, color: ACCENT });
      // Left footer: branding + legal
      p.drawText("HostCheckIn", {
        x: M + 8, y: M + 11, size: 7.5, font: fontB, color: NAVY,
      });
      p.drawText(clean("Signature électronique — Loi marocaine n° 53-05"),
        { x: M + 8 + Tw("HostCheckIn", 7.5, fontB) + 8, y: M + 11, size: 7, font, color: GRAY_1 });
      // Center: ref
      const midT = `Réf. ${bookRef}`;
      p.drawText(midT, {
        x: (PW - Tw(midT, 7, fontMB)) / 2, y: M + 11, size: 7, font: fontMB, color: GRAY_1,
      });
      // Right: Page X / Y
      const pg = `Page ${i + 1} / ${total}`;
      p.drawText(pg, {
        x: PW - M - Tw(pg, 7.5, fontB), y: M + 11, size: 7.5, font: fontB, color: NAVY,
      });
    }

    // ── Save & upload ─────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const pdfBytesHash = await sha256Bytes(pdfBytes);
    const storagePath = `${reservation_id}/${contract_id}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage.from("contract-pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Workflow target: host consent is materialised by emission; sealing can
    // therefore happen as soon as the tenant has signed.
    const shouldSeal = contractAccepted;

    await supabase.from("contracts").update({
      pdf_storage_path: storagePath,
      content_hash: contentHash,
      pdf_bytes_hash: pdfBytesHash,
      pdf_url: storagePath,
      locked: shouldSeal,
      sealed_at: shouldSeal ? new Date().toISOString() : null,
    }).eq("id", contract_id);

    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await supabase.from("signature_audit_log").insert({
      contract_id, reservation_id,
      event_type: "pdf_generated", signer_role: "system",
      ip_address, user_agent: req.headers.get("user-agent") || "unknown",
      metadata: {
        content_hash: contentHash, pdf_bytes_hash: pdfBytesHash,
        pdf_path: storagePath, pdf_size_bytes: pdfBytes.length,
        sealed: shouldSeal, both_signed: bothSigned,
      },
    });

    return new Response(JSON.stringify({
      pdf_storage_path: storagePath,
      content_hash: contentHash,
      pdf_bytes_hash: pdfBytesHash,
      pdf_size_bytes: pdfBytes.length,
      sealed: shouldSeal,
      both_signed: bothSigned,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Generate PDF error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
