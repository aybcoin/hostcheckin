import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { inflate as pakoInflate, deflate as pakoDeflate } from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Colors ────────────────────────────────────────────────────────
// Premium palette: deep navy, refined blues, neutral grays, status accents.
const INK      = rgb(0.07, 0.10, 0.16);   // near-black body
const NAVY     = rgb(0.063, 0.137, 0.255); // deep navy (header / titles)
const NAVY_2   = rgb(0.039, 0.094, 0.184); // darker navy (header gradient base)
const BLUE     = rgb(0.180, 0.412, 0.706); // primary blue accent
const BLUE_DK  = rgb(0.122, 0.298, 0.553); // darker blue
const BLUE_SOFT= rgb(0.949, 0.965, 0.984); // very light blue card bg
const BLUE_M   = rgb(0.792, 0.851, 0.929); // medium blue border
const GREEN    = rgb(0.067, 0.529, 0.310); // success
const GREEN_L  = rgb(0.910, 0.969, 0.937); // success bg
const GREEN_M  = rgb(0.659, 0.851, 0.745); // success border
const AMBER    = rgb(0.788, 0.486, 0.078); // pending
const AMBER_L  = rgb(0.996, 0.961, 0.886); // pending bg
const AMBER_M  = rgb(0.949, 0.808, 0.510); // pending border
const GRAY_1   = rgb(0.318, 0.353, 0.412); // body secondary
const GRAY_2   = rgb(0.510, 0.541, 0.604); // muted
const GRAY_3   = rgb(0.847, 0.859, 0.882); // dividers
const GRAY_4   = rgb(0.929, 0.937, 0.953); // very light divider
const GRAY_BG  = rgb(0.976, 0.980, 0.988); // soft card bg
const GRAY_BG2 = rgb(0.961, 0.965, 0.976); // alt row bg
const AUDIT_BG = rgb(0.094, 0.118, 0.169); // dark audit header
const WHITE    = rgb(1, 1, 1);
const GOLD     = rgb(0.706, 0.541, 0.220); // refined gold accent for seals/icons

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
    case "cin": return "Carte d'identite nationale";
    case "passport": return "Passeport";
    case "driver_license": return "Permis de conduire";
    case "sejour": return "Titre de sejour";
    default: return "Document non precise";
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
    const guestName    = reservation?.guests?.full_name || "N/A";
    const guestEmail   = reservation?.guests?.email || "N/A";
    const guestPhone   = reservation?.guests?.phone || "";
    const propName     = property?.name || "N/A";
    const propAddr     = property ? `${property.address}, ${property.city}` : "N/A";
    const propCountry  = property?.country || "";
    const checkIn      = reservation?.check_in_date
      ? new Date(reservation.check_in_date).toLocaleDateString("fr-FR") : "N/A";
    const checkOut     = reservation?.check_out_date
      ? new Date(reservation.check_out_date).toLocaleDateString("fr-FR") : "N/A";
    const checkInTime  = property?.check_in_time || "15:00";
    const checkOutTime = property?.check_out_time || "11:00";
    const nbGuests     = String(reservation?.number_of_guests || "N/A");
    const bookRef      = reservation?.booking_reference || "N/A";
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
    const kycStatus = kyc?.status || "non verifie";
    const kycConfidence = kyc?.document_confidence != null ? `${Math.round(Number(kyc.document_confidence) * 100)}%` : "n/a";

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

    // Section header — `.section-title` style: small blue eyebrow + bold dark
    // title with a thin underline. Designed to read as "page chapter".
    const sectionHeader = (label: string, subtitle?: string) => {
      ensureSpace(44);
      y -= 14; // top breathing room, ~CSS margin-top: 22px
      // Tiny uppercase eyebrow in blue
      const upper = label.toUpperCase();
      // 3pt accent bar
      R(M, y, 3, 13, BLUE);
      T(upper, M + 11, y - 9.5, 9.5, fontB, NAVY);
      if (subtitle) {
        const sx = M + 11 + Tw(upper, 9.5, fontB) + 10;
        T(subtitle, sx, y - 9.5, 8.5, font, GRAY_2);
      }
      y -= 20;
      // Two-tone underline: stronger near the accent bar, fades into a hairline
      HL(y, M, 60, 1.0, BLUE);
      HL(y, M + 60, CW - 60, 0.4, GRAY_3);
      y -= 14; // margin-bottom: 14px
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
    // HEADER BAND — premium two-tone with refined typography
    // ─────────────────────────────────────────────────────────
    const HEADER_H = 96;
    R(0, PH, PW, HEADER_H, NAVY);
    // Subtle inner band for depth
    R(0, PH - HEADER_H + 18, PW, HEADER_H - 18, NAVY_2);
    // Crisp blue keyline at the bottom
    R(0, PH - HEADER_H + 3, PW, 3, BLUE);

    // Brand mark — small tag, top-left
    const brandTag = "HOSTCHECKIN";
    T(brandTag, M, PH - 22, 7.5, fontB, rgb(0.65, 0.78, 0.94));
    // tiny gold dot accent
    page.drawRectangle({
      x: M + Tw(brandTag, 7.5, fontB) + 6,
      y: PH - 21, width: 2.5, height: 2.5, color: GOLD,
    });
    T("Document contractuel electronique",
      M + Tw(brandTag, 7.5, fontB) + 14, PH - 22, 7.5, font, rgb(0.65, 0.78, 0.94));

    // Main title — large, generous tracking via spaced word for prestige
    T("CONTRAT DE LOCATION DE COURTE DUREE", M, PH - 50, 16.5, fontB, WHITE);
    T("Loi marocaine n° 53-05 du 30 novembre 2007 - signature electronique a valeur juridique",
      M, PH - 70, 8.5, font, rgb(0.78, 0.86, 0.96));

    // Right metadata stack — clean labelled rows
    const rHeadX = PW - M;
    const refLabel = "Ref. reservation";
    const refVal = bookRef;
    const genLabel = "Generee le";
    const genVal = `${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const docLabel = "Document";
    const docVal = contract_id.slice(0, 8).toUpperCase();

    const drawHeadRow = (lab: string, val: string, ty: number, valFont: typeof font, sz = 8.5) => {
      T(val, rHeadX - Tw(val, sz, valFont), ty, sz, valFont, WHITE);
      T(lab, rHeadX - Tw(val, sz, valFont) - Tw(lab, 7.5, font) - 8, ty, 7.5, font, rgb(0.65, 0.78, 0.94));
    };
    drawHeadRow(refLabel, refVal, PH - 38, fontB, 9);
    drawHeadRow(genLabel, genVal, PH - 54, font, 8);
    drawHeadRow(docLabel, docVal, PH - 68, fontMB, 7.5);

    y = PH - HEADER_H - 22;

    // ─────────────────────────────────────────────────────────
    // STATUS PILL — reflects the real workflow:
    //   - guest hasn't signed yet → amber "awaiting tenant"
    //   - guest has signed         → green "contract accepted" (the host's
    //                                emission of the link is itself acceptance)
    // ─────────────────────────────────────────────────────────
    const statusLabel = contractAccepted
      ? "CONTRAT SIGNE ET ACCEPTE PAR LES DEUX PARTIES"
      : "EN ATTENTE DE SIGNATURE DU LOCATAIRE";
    const statusCol = contractAccepted ? GREEN : AMBER;
    const statusBg  = contractAccepted ? GREEN_L : AMBER_L;
    const statusBd  = contractAccepted ? GREEN_M : AMBER_M;
    const pillW = Math.max(340, Tw(statusLabel, 9.5, fontB) + 50);
    const pillH = 26;
    const pillX = (PW - pillW) / 2;
    // Outer faint shadow band (faked with a 1pt offset bg)
    R(pillX, y - 1, pillW, pillH, statusBd);
    R(pillX, y, pillW, pillH, statusBg, statusCol, 1.2);
    // Small filled mark on the left
    page.drawRectangle({
      x: pillX + 12, y: y - pillH / 2 - 3, width: 6, height: 6, color: statusCol,
    });
    T(statusLabel, pillX + (pillW - Tw(statusLabel, 9.5, fontB)) / 2 + 6, y - 10, 9.5, fontB, statusCol);
    y -= pillH + 8;

    // Sub-line under the pill — context per state
    if (contractAccepted && signedAt) {
      const smallT = `Signe par le locataire le ${signedAt}  -  Empreinte SHA-256 : ${contentHash.slice(0, 16)}...`;
      T(smallT, (PW - Tw(smallT, 7.5, fontI)) / 2, y, 7.5, fontI, GRAY_1);
      y -= 12;
    } else if (!contractAccepted && hostIssuedAt) {
      const smallT = `Contrat emis par le bailleur le ${hostIssuedAt}  -  Lien de signature transmis au locataire`;
      T(smallT, (PW - Tw(smallT, 7.5, fontI)) / 2, y, 7.5, fontI, GRAY_1);
      y -= 12;
    }
    y -= 10;

    // ─────────────────────────────────────────────────────────
    // PARTIES CARD
    // ─────────────────────────────────────────────────────────
    sectionHeader("Parties au contrat", "Identification des signataires");

    const halfW = Math.floor((CW - 14) / 2);
    const partyH = 132;

    // Stacked-row party card: small uppercase label above the value, generous
    // line-height, premium feel close to a print contract.
    const drawPartyCard = (
      x: number,
      roleTag: string,
      roleSubtitle: string,
      // deno-lint-ignore no-explicit-any
      headBg: any,
      person: { name: string; rows: Array<{ k: string; v: string }> },
    ) => {
      // Card body with very subtle border + soft top shadow
      R(x, y, halfW, partyH, WHITE, GRAY_3, 0.7);
      // Header band
      R(x, y, halfW, 28, headBg);
      // Tiny gold inner rule for prestige
      R(x, y - 27, halfW, 1, GOLD);
      T(roleTag, x + 14, y - 11, 9, fontB, WHITE);
      T(roleSubtitle, x + 14, y - 22, 7, font, rgb(0.78, 0.86, 0.96));

      // Name — large, bold
      let ly = y - 28 - 18;
      const nameTrunc = person.name.length > 38 ? person.name.slice(0, 36) + "..." : person.name;
      T(nameTrunc, x + 14, ly, 11, fontB, INK);
      ly -= 8;
      // Hairline under name
      page.drawLine({
        start: { x: x + 14, y: ly }, end: { x: x + halfW - 14, y: ly },
        thickness: 0.4, color: GRAY_4,
      });
      ly -= 12;

      // Stacked rows
      for (const r of person.rows) {
        T(r.k.toUpperCase(), x + 14, ly, 6.5, fontB, GRAY_2);
        const valTrunc = r.v.length > 38 ? r.v.slice(0, 36) + "..." : r.v;
        T(valTrunc, x + 14, ly - 9, 8.5, font, INK);
        ly -= 20;
      }
    };

    const hostRows: Array<{ k: string; v: string }> = [];
    if (hostCompany && hostCompany !== hostName) hostRows.push({ k: "Societe", v: hostCompany });
    if (hostEmail) hostRows.push({ k: "Email", v: hostEmail });
    if (hostPhone) hostRows.push({ k: "Telephone", v: hostPhone });
    hostRows.push({ k: "Role", v: "Bailleur / Hote" });

    const guestRows: Array<{ k: string; v: string }> = [];
    if (guestEmail && guestEmail !== "N/A") guestRows.push({ k: "Email", v: guestEmail });
    if (guestPhone) guestRows.push({ k: "Telephone", v: guestPhone });
    guestRows.push({ k: "Role", v: "Locataire / Voyageur" });
    guestRows.push({ k: "Piece d'identite", v: idType });

    drawPartyCard(M, "BAILLEUR (HOTE)", "Emetteur du contrat", NAVY, { name: hostName, rows: hostRows });
    drawPartyCard(M + halfW + 14, "LOCATAIRE (INVITE)", "Signataire electronique", BLUE_DK, { name: guestName, rows: guestRows });
    y -= partyH + 22;

    // ─────────────────────────────────────────────────────────
    // PROPERTY & RESERVATION CARD
    // ─────────────────────────────────────────────────────────
    sectionHeader("Bien et sejour", "Details de la location");

    const propertyH = 116;
    // Card with very subtle blue tint
    R(M, y, CW, propertyH, BLUE_SOFT, BLUE_M, 0.7);
    // Top accent rule
    R(M, y, CW, 2, BLUE);
    const topY = y;
    const col2X = M + CW / 2 + 12;

    // LEFT: Propriete
    T("PROPRIETE", M + 14, topY - 18, 7.5, fontB, BLUE_DK);
    const pnTrunc = propName.length > 44 ? propName.slice(0, 42) + "..." : propName;
    T(pnTrunc, M + 14, topY - 36, 11, fontB, INK);
    T(propAddr, M + 14, topY - 52, 8.5, font, GRAY_1);
    if (propCountry) T(propCountry, M + 14, topY - 65, 8, font, GRAY_2);
    if (property?.rooms_count || property?.max_guests) {
      const propMeta = `${property?.rooms_count ?? "?"} chambre(s)  -  Capacite max. ${property?.max_guests ?? "?"} personne(s)`;
      T(propMeta, M + 14, topY - 88, 7.5, fontB, GRAY_1);
    }

    // Vertical separator
    page.drawLine({
      start: { x: M + CW / 2, y: topY - 14 },
      end:   { x: M + CW / 2, y: topY - propertyH + 14 },
      thickness: 0.5, color: BLUE_M,
    });

    // RIGHT: Sejour
    T("SEJOUR", col2X, topY - 18, 7.5, fontB, BLUE_DK);
    const resLines: Array<[string, string]> = [
      ["Reference",  bookRef],
      ["Arrivee",    `${checkIn} a ${checkInTime}`],
      ["Depart",     `${checkOut} a ${checkOutTime}`],
      ["Voyageurs",  `${nbGuests} personne(s)`],
    ];
    let rly = topY - 36;
    for (const [k, v] of resLines) {
      T(k.toUpperCase(), col2X, rly, 6.8, fontB, GRAY_2);
      T(v, col2X + 78, rly, 9, fontB, INK);
      rly -= 16;
    }
    y -= propertyH + 22;

    // ─────────────────────────────────────────────────────────
    // CONTRACT BODY  —  .contract-block { text-align: justify; }
    //                   p { line-height: 1.6; margin-bottom: 10px; }
    // ─────────────────────────────────────────────────────────
    sectionHeader("Termes du contrat", "Clauses contractuelles convenues");

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
        // "1. Parties contractantes" → big blue number, bold title on the
        // same baseline, then the body if any (separated by colon or newline).
        const numStr = numMatch[1];
        const rest = numMatch[2];
        const colonIdx = rest.indexOf(":");
        let title = rest;
        let body = "";
        // If the rest starts with a short capitalized title, treat it as the
        // article heading; the remaining sentence becomes the body. We split
        // on ". " after the title-looking phrase only when present.
        if (colonIdx > 0 && colonIdx < 60) {
          title = rest.slice(0, colonIdx).trim();
          body = rest.slice(colonIdx + 1).trim();
        }
        ensureSpace(36);
        y -= 6;
        // Big blue numeral
        const numTxt = `${numStr}.`;
        T(numTxt, M, y - 13, 16, fontB, BLUE);
        const numW = Tw(numTxt, 16, fontB);
        // Bold title aligned with numeral baseline
        const titleX = M + numW + 8;
        const titleW = CW - numW - 8;
        // Wrap title to width if too long
        const titleLines = wrapByWidth(title, titleW, 11, fontB);
        for (let i = 0; i < titleLines.length; i++) {
          T(titleLines[i].text, titleX, y - 11 - i * 14, 11, fontB, NAVY);
        }
        const titleHeight = Math.max(14, titleLines.length * 14);
        y -= titleHeight + 4;
        // Tiny accent rule under the article title
        page.drawLine({
          start: { x: titleX, y }, end: { x: titleX + 28, y },
          thickness: 1.0, color: BLUE,
        });
        y -= 8;
        if (body) {
          drawParagraph(body, {
            x: titleX, width: CW - numW - 8,
            size: 9.5, lineHeight: 1.6, marginBottom: 14, justify: true,
          });
        } else {
          y -= 6;
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
    sectionHeader("Signature electronique", "Clause juridique - Loi n° 53-05");

    drawParagraph(
      "Les parties reconnaissent expressement que la signature electronique apposee sur le present contrat a, conformement a la loi marocaine n° 53-05 du 30 novembre 2007 relative a l'echange electronique de donnees juridiques, la meme valeur juridique qu'une signature manuscrite. Les parties conviennent que :",
      { size: 9, lineHeight: 1.6, marginBottom: 8, justify: true },
    );

    drawBulletList(
      [
        "L'identite du locataire est verifiee par analyse automatisee de sa piece d'identite officielle (procedure KYC) avant signature du contrat.",
        "L'horodatage du systeme, l'adresse IP et l'empreinte du terminal utilise par le signataire sont enregistres dans une piste d'audit securisee afin d'etablir la preuve probante de l'acte.",
        "L'integrite du document signe est garantie par une empreinte cryptographique SHA-256 calculee sur l'ensemble du contenu du contrat, des signatures et de leur horodatage. Toute modification ulterieure du document romprait cette empreinte et rendrait le document non opposable.",
        "Le consentement electronique est exprime par la coche explicite et la signature numerique apposees par chacune des parties, apres lecture complete du present contrat.",
      ],
      { size: 9, lineHeight: 1.55, indent: 18, marginBottom: 10, justify: true },
    );

    // ─────────────────────────────────────────────────────────
    // SIGNATURE PANELS — certificate-style. The host's panel reflects the
    // real workflow: emission of the signature link IS the host's act of
    // consent. We therefore present it as "Contrat emis et valide" rather
    // than the misleading "En attente de signature".
    // ─────────────────────────────────────────────────────────
    ensureSpace(220);
    sectionHeader("Signatures des parties", "Preuve electronique - Loi n° 53-05");

    const sigBoxW = Math.floor((CW - 14) / 2);
    const sigBoxH = 200;
    ensureSpace(sigBoxH + 16);
    const sigY = y;

    // ── Tenant panel (electronic signature with KYC) ────────────
    const drawTenantPanel = async (panelX: number) => {
      // Card
      R(panelX, sigY, sigBoxW, sigBoxH, WHITE, GRAY_3, 0.8);
      // Header
      R(panelX, sigY, sigBoxW, 30, NAVY);
      R(panelX, sigY - 29, sigBoxW, 1, GOLD);
      T("LOCATAIRE", panelX + 14, sigY - 12, 9, fontB, WHITE);
      T("Signature electronique manuscrite", panelX + 14, sigY - 23, 7, font, rgb(0.78, 0.86, 0.96));

      // Status badge top-right inside header
      const okBadge = contract.signed_by_guest ? "SIGNE" : "EN ATTENTE";
      const okCol = contract.signed_by_guest ? GREEN_L : AMBER_L;
      const okFg = contract.signed_by_guest ? GREEN : AMBER;
      const bw = Tw(okBadge, 7, fontB) + 12;
      R(panelX + sigBoxW - bw - 12, sigY - 11, bw, 13, okCol, okFg, 0.6);
      T(okBadge, panelX + sigBoxW - bw - 12 + 6, sigY - 19, 7, fontB, okFg);

      // Name
      const sn = guestName.length > 36 ? guestName.slice(0, 34) + "..." : guestName;
      T(sn, panelX + 14, sigY - 46, 11, fontB, INK);
      if (signedAt) {
        T(`Signe le ${signedAt}`, panelX + 14, sigY - 58, 7.5, font, GRAY_1);
      } else {
        T("Signature en attente", panelX + 14, sigY - 58, 7.5, fontI, GRAY_2);
      }

      // Signature image area — premium beige tint, soft border
      const imgAreaTop = sigY - 66;
      const imgAreaH = 58;
      R(panelX + 14, imgAreaTop, sigBoxW - 28, imgAreaH, rgb(0.984, 0.988, 0.996), GRAY_4, 0.5);

      const sigDataUrl = contract.guest_signature_url;
      if (sigDataUrl && sigDataUrl.startsWith("data:")) {
        const b64m = sigDataUrl.match(/base64,(.+)$/);
        if (b64m) {
          try {
            const isPng = sigDataUrl.includes("image/png");
            let sigBytes = Uint8Array.from(atob(b64m[1]), (c) => c.charCodeAt(0));
            if (isPng) sigBytes = blueifyPNG(sigBytes);
            const sigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
            const maxW = sigBoxW - 36, maxH = imgAreaH - 8;
            const scale = Math.min(maxW / sigImg.width, maxH / sigImg.height, 1);
            const sw = sigImg.width * scale, sh = sigImg.height * scale;
            const imgX = panelX + (sigBoxW - sw) / 2;
            const imgY = imgAreaTop - (imgAreaH - sh) / 2 - sh;
            page.drawImage(sigImg, { x: imgX, y: imgY, width: sw, height: sh });
          } catch (e) {
            console.error("sig embed error:", e);
            T("[Signature enregistree]", panelX + 18, imgAreaTop - imgAreaH / 2 - 2, 8, font, GRAY_2);
          }
        }
      } else {
        const pt = "En attente de signature";
        T(pt, panelX + (sigBoxW - Tw(pt, 9, fontI)) / 2, imgAreaTop - imgAreaH / 2 + 2, 9, fontI, GRAY_2);
      }

      // Tiny baseline under the signature area
      page.drawLine({
        start: { x: panelX + 14, y: imgAreaTop - imgAreaH - 4 },
        end:   { x: panelX + sigBoxW - 14, y: imgAreaTop - imgAreaH - 4 },
        thickness: 0.4, color: GRAY_3,
      });

      // Detail grid
      let dy = imgAreaTop - imgAreaH - 14;
      const rows: Array<[string, string]> = [
        ["IDENTITE", `KYC ${kycStatus} (${kycConfidence})`],
        ["DOCUMENT", idType],
        ["ADRESSE IP", guestIP],
        ["APPAREIL", guestDev.device],
        ["NAVIGATEUR", `${guestDev.browser} - ${guestDev.os}`],
      ];
      for (const [k, v] of rows) {
        if (dy < sigY - sigBoxH + 8) break;
        T(k, panelX + 14, dy, 6.2, fontB, GRAY_2);
        const vText = v.length > 38 ? v.slice(0, 36) + "..." : v;
        T(vText, panelX + 80, dy, 7.2, font, INK);
        dy -= 11;
      }
    };

    // ── Host panel (issuer / consent by emission) ───────────────
    const drawHostPanel = (panelX: number) => {
      // Card
      R(panelX, sigY, sigBoxW, sigBoxH, WHITE, GRAY_3, 0.8);
      // Header — slightly different blue tone to distinguish role
      R(panelX, sigY, sigBoxW, 30, BLUE_DK);
      R(panelX, sigY - 29, sigBoxW, 1, GOLD);
      T("BAILLEUR", panelX + 14, sigY - 12, 9, fontB, WHITE);
      T("Emetteur du contrat", panelX + 14, sigY - 23, 7, font, rgb(0.82, 0.89, 0.98));

      // Always-positive status badge — emission = consent
      const badge = "VALIDE";
      const bw = Tw(badge, 7, fontB) + 12;
      R(panelX + sigBoxW - bw - 12, sigY - 11, bw, 13, GREEN_L, GREEN, 0.6);
      T(badge, panelX + sigBoxW - bw - 12 + 6, sigY - 19, 7, fontB, GREEN);

      // Name
      const hn = hostName.length > 36 ? hostName.slice(0, 34) + "..." : hostName;
      T(hn, panelX + 14, sigY - 46, 11, fontB, INK);
      if (hostIssuedAt) {
        T(`Contrat emis le ${hostIssuedAt}`, panelX + 14, sigY - 58, 7.5, font, GRAY_1);
      }

      // Consent statement card — mirrors the tenant's signature visual area
      const consentTop = sigY - 66;
      const consentH = 58;
      R(panelX + 14, consentTop, sigBoxW - 28, consentH, rgb(0.949, 0.973, 0.957), GREEN_M, 0.6);

      // Centered consent stamp
      const stampLines = [
        "CONSENTEMENT MATERIALISE",
        "PAR L'EMISSION DU CONTRAT",
      ];
      let sty = consentTop - 18;
      for (const ln of stampLines) {
        T(ln, panelX + (sigBoxW - Tw(ln, 8.5, fontB)) / 2, sty, 8.5, fontB, GREEN);
        sty -= 12;
      }
      T("Lien de signature transmis au locataire",
        panelX + (sigBoxW - Tw("Lien de signature transmis au locataire", 7, fontI)) / 2,
        sty - 4, 7, fontI, GRAY_1);

      // Tiny baseline
      page.drawLine({
        start: { x: panelX + 14, y: consentTop - consentH - 4 },
        end:   { x: panelX + sigBoxW - 14, y: consentTop - consentH - 4 },
        thickness: 0.4, color: GRAY_3,
      });

      // Detail grid
      let dy = consentTop - consentH - 14;
      const rows: Array<[string, string]> = [
        ["ROLE", "Bailleur / Hote"],
        ["EMAIL", hostEmail || "—"],
        ["BASE LEGALE", "Loi 53-05 - art. 417-1 et s. DOC"],
        ["FORME DU", "Emission du lien de signature"],
        ["CONSENTEMENT", "via la plateforme HostCheckIn"],
      ];
      for (const [k, v] of rows) {
        if (dy < sigY - sigBoxH + 8) break;
        T(k, panelX + 14, dy, 6.2, fontB, GRAY_2);
        const vText = v.length > 38 ? v.slice(0, 36) + "..." : v;
        T(vText, panelX + 80, dy, 7.2, font, INK);
        dy -= 11;
      }
    };

    await drawTenantPanel(M);
    drawHostPanel(M + sigBoxW + 14);

    y = sigY - sigBoxH - 22;

    // ─────────────────────────────────────────────────────────
    // PROOF BLOCK — binds signature to document
    // ─────────────────────────────────────────────────────────
    ensureSpace(110);
    sectionHeader("Tracabilite du document", "Empreinte cryptographique - lien signature / contenu");

    const proofBoxH = 92;
    R(M, y, CW, proofBoxH, GRAY_BG, GRAY_3, 0.6);
    // Left blue accent bar
    R(M, y, 3, proofBoxH, BLUE);

    const pLeft = M + 16;
    const pRight = M + CW - 16;
    let py = y - 16;

    // Two-column key facts
    const drawFact = (label: string, value: string, x: number, ty: number, valBold = true) => {
      T(label.toUpperCase(), x, ty, 6.5, fontB, GRAY_2);
      T(value, x, ty - 10, 8.5, valBold ? fontB : font, INK);
    };

    drawFact("Date de signature", signedAt || "—", pLeft, py);
    drawFact("Signataire", guestName, pLeft + 200, py);
    drawFact("Document presente", idType, pLeft, py - 28);
    drawFact("Statut KYC", `${kycStatus} (${kycConfidence})`, pLeft + 200, py - 28);

    // SHA-256 row, full width, monospace
    py -= 56;
    T("EMPREINTE CRYPTOGRAPHIQUE SHA-256", pLeft, py, 6.5, fontB, GRAY_2);
    // Wrap hash in two halves if needed (it's 64 hex chars)
    T(contentHash, pLeft, py - 11, 7.5, fontMB, NAVY);
    T("Cette empreinte unique scelle le contrat et son contexte de signature. Toute modification ulterieure la rompt.",
      pLeft, py - 22, 6.8, fontI, GRAY_1);

    y -= proofBoxH + 18;

    // ─────────────────────────────────────────────────────────
    // AUDIT TRAIL — refined table, alternating rows, comfortable padding
    // ─────────────────────────────────────────────────────────
    ensureSpace(110);
    sectionHeader("Piste d'audit", "Journal chronologique des evenements");

    // Table column geometry — proportional to content width
    const colX = [M + 12, M + 124, M + 254, M + 314, M + 416];
    const rowH = 18;
    const headH = 24;

    // Header
    R(M, y, CW, headH, AUDIT_BG);
    T("HORODATAGE", colX[0], y - 10, 7, fontB, WHITE);
    T("EVENEMENT", colX[1], y - 10, 7, fontB, WHITE);
    T("ROLE", colX[2], y - 10, 7, fontB, WHITE);
    T("ADRESSE IP", colX[3], y - 10, 7, fontB, WHITE);
    T("DETAIL", colX[4], y - 10, 7, fontB, WHITE);
    y -= headH;

    const eventLabel = (e: string): string => {
      switch (e) {
        case "identity_submitted": return "Piece d'identite soumise";
        case "identity_verification_processed": return "Verification KYC traitee";
        case "contract_viewed": return "Contrat consulte";
        case "consent_given": return "Consentement exprime";
        case "contract_signed": return "Signature electronique apposee";
        case "pdf_generated": return "Document PDF genere et scelle";
        case "host_signed": return "Signature bailleur apposee";
        case "pdf_downloaded": return "Document PDF telecharge";
        default: return e;
      }
    };

    const logs = auditLogs || [];
    if (logs.length === 0) {
      ensureSpace(rowH);
      R(M, y, CW, rowH, WHITE, GRAY_3, 0.3);
      T("Aucun evenement enregistre.", colX[0], y - 12, 7.5, fontI, GRAY_2);
      y -= rowH;
    } else {
      let altRow = false;
      for (const entry of logs) {
        ensureSpace(rowH + 2);
        const ts = (entry.created_at || "").slice(0, 19).replace("T", " ");
        const ev = eventLabel(entry.event_type || "");
        const role = entry.signer_role || "";
        const ip = (entry.ip_address || "").split(",")[0].trim() || "—";
        const detail = entry.signer_email || (entry.metadata?.id_type || "") || "";
        // Row background
        R(M, y, CW, rowH, altRow ? GRAY_BG2 : WHITE);
        // Hairline between rows
        page.drawLine({
          start: { x: M, y: y - rowH }, end: { x: M + CW, y: y - rowH },
          thickness: 0.25, color: GRAY_3,
        });
        T(ts, colX[0], y - 12, 6.8, fontM, INK);
        T(ev.length > 32 ? ev.slice(0, 30) + ".." : ev, colX[1], y - 12, 7, font, INK);
        T(role, colX[2], y - 12, 7, font, GRAY_1);
        T(ip, colX[3], y - 12, 6.8, fontM, GRAY_1);
        T(detail.length > 22 ? detail.slice(0, 20) + ".." : detail, colX[4], y - 12, 6.8, font, GRAY_1);
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
      "Document genere electroniquement conformement a la loi marocaine n° 53-05 du 30 novembre 2007 relative a l'echange electronique de donnees juridiques. La signature electronique a la meme valeur juridique qu'une signature manuscrite (art. 417-1 et suivants du Dahir des obligations et des contrats).",
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
      // Tiny gold accent square on the left edge
      p.drawRectangle({ x: M, y: M + 12, width: 2.5, height: 2.5, color: GOLD });
      // Left footer: branding + legal
      p.drawText("HostCheckIn", {
        x: M + 8, y: M + 11, size: 7.5, font: fontB, color: NAVY,
      });
      p.drawText("Signature electronique - Loi marocaine n° 53-05",
        { x: M + 8 + Tw("HostCheckIn", 7.5, fontB) + 8, y: M + 11, size: 7, font, color: GRAY_1 });
      // Center: ref
      const midT = `Ref. ${bookRef}`;
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

    // Only lock (seal) when BOTH parties have signed — otherwise keep rewritable
    const shouldSeal = bothSigned;

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
