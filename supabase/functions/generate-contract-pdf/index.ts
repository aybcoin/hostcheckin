import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { inflate as pakoInflate, deflate as pakoDeflate } from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Colors ────────────────────────────────────────────────────────
const INK      = rgb(0.09, 0.13, 0.19);   // near-black body
const NAVY     = rgb(0.086, 0.184, 0.353);
const BLUE     = rgb(0.196, 0.451, 0.741);
const BLUE_SOFT= rgb(0.918, 0.941, 0.980);
const BLUE_M   = rgb(0.729, 0.812, 0.918);
const GREEN    = rgb(0.047, 0.565, 0.314);
const GREEN_L  = rgb(0.878, 0.965, 0.922);
const AMBER    = rgb(0.843, 0.525, 0.098);
const AMBER_L  = rgb(0.996, 0.953, 0.878);
const GRAY_1   = rgb(0.388, 0.416, 0.478); // body secondary
const GRAY_2   = rgb(0.580, 0.600, 0.651); // muted
const GRAY_3   = rgb(0.820, 0.831, 0.859); // dividers
const GRAY_BG  = rgb(0.973, 0.976, 0.984); // soft card bg
const AUDIT_BG = rgb(0.118, 0.141, 0.188); // dark audit card
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

// ── Word wrap ─────────────────────────────────────────────────────
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

    const bothSigned = contract.signed_by_guest === true && contract.signed_by_host === true;

    // ── PDF setup ──────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontI = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontM = await pdfDoc.embedFont(StandardFonts.Courier);
    const PW = 595, PH = 842, M = 44, CW = PW - M * 2;
    const FOOTER_RESERVED = 44;  // space to keep clear for footer

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

    // Section header: thin accent bar + uppercase label
    const sectionHeader = (label: string, subtitle?: string) => {
      ensureSpace(30);
      R(M, y, 3, 14, BLUE);
      T(label.toUpperCase(), M + 10, y - 10, 9.5, fontB, INK);
      if (subtitle) {
        T(subtitle, M + 10 + Tw(label.toUpperCase(), 9.5, fontB) + 10, y - 10, 8.5, font, GRAY_2);
      }
      y -= 18;
      HL(y, M, CW, 0.5, GRAY_3);
      y -= 12;
    };

    // ─────────────────────────────────────────────────────────
    // HEADER BAND
    // ─────────────────────────────────────────────────────────
    R(0, PH, PW, 78, NAVY);
    R(0, PH - 74, PW, 4, BLUE);

    T("CONTRAT DE LOCATION DE COURTE DUREE", M, PH - 28, 14.5, fontB, WHITE);
    T("Document electronique - Loi marocaine n° 53-05", M, PH - 46, 9, font, rgb(0.78, 0.85, 0.95));

    // Right metadata
    const rHeadX = PW - M;
    const refT = `Ref. reservation : ${bookRef}`;
    T(refT, rHeadX - Tw(refT, 8.5, font), PH - 28, 8.5, font, WHITE);
    const genT = `Genere le : ${new Date().toLocaleDateString("fr-FR")} - ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    T(genT, rHeadX - Tw(genT, 7.5, font), PH - 42, 7.5, font, rgb(0.78, 0.85, 0.95));
    const docNum = `Doc. ${contract_id.slice(0, 8)}`;
    T(docNum, rHeadX - Tw(docNum, 7, fontM), PH - 56, 7, fontM, rgb(0.78, 0.85, 0.95));

    y = PH - 78 - 18;

    // ─────────────────────────────────────────────────────────
    // STATUS PILL
    // ─────────────────────────────────────────────────────────
    const statusLabel = bothSigned
      ? "CONTRAT SIGNE ET SCELLE PAR LES DEUX PARTIES"
      : contract.signed_by_guest
        ? "SIGNE PAR LE LOCATAIRE - EN ATTENTE DU BAILLEUR"
        : contract.signed_by_host
          ? "SIGNE PAR LE BAILLEUR - EN ATTENTE DU LOCATAIRE"
          : "EN ATTENTE DE SIGNATURE";
    const statusCol = bothSigned ? GREEN : AMBER;
    const statusBg = bothSigned ? GREEN_L : AMBER_L;
    const pillW = Math.max(300, Tw(statusLabel, 9, fontB) + 28);
    const pillH = 22;
    const pillX = (PW - pillW) / 2;
    R(pillX, y, pillW, pillH, statusBg, statusCol, 1);
    T(statusLabel, pillX + (pillW - Tw(statusLabel, 9, fontB)) / 2, y - 8, 9, fontB, statusCol);
    y -= pillH + 6;

    if (bothSigned && signedAt) {
      const smallT = `Scelle le ${signedAt} - Empreinte numerique SHA-256 : ${contentHash.slice(0, 24)}...`;
      T(smallT, (PW - Tw(smallT, 7.5, font)) / 2, y, 7.5, font, GRAY_1);
      y -= 12;
    }
    y -= 8;

    // ─────────────────────────────────────────────────────────
    // PARTIES CARD
    // ─────────────────────────────────────────────────────────
    sectionHeader("Parties au contrat", "Identification des signataires");

    const halfW = Math.floor((CW - 12) / 2);
    const partyH = 108;

    const drawPartyCard = (x: number, roleTag: string, lines: Array<{ k: string; v: string; bold?: boolean }>) => {
      R(x, y, halfW, partyH, WHITE, GRAY_3);
      R(x, y, halfW, 22, NAVY);
      T(roleTag, x + 10, y - 8, 8.5, fontB, WHITE);
      let ly = y - 22 - 12;
      for (const l of lines) {
        if (l.k) {
          T(l.k, x + 10, ly, 7, font, GRAY_2);
          const kw = Tw(l.k, 7, font);
          T(l.v, x + 10 + kw + 4, ly, 8.5, l.bold ? fontB : font, INK);
        } else {
          T(l.v, x + 10, ly, 8.5, l.bold ? fontB : font, INK);
        }
        ly -= 12;
      }
    };

    const hostLines: Array<{ k: string; v: string; bold?: boolean }> = [
      { k: "", v: hostName, bold: true },
    ];
    if (hostCompany && hostCompany !== hostName) hostLines.push({ k: "Societe : ", v: hostCompany });
    if (hostEmail) hostLines.push({ k: "Email : ", v: hostEmail });
    if (hostPhone) hostLines.push({ k: "Tel. : ", v: hostPhone });
    hostLines.push({ k: "Role : ", v: "Bailleur / Hote" });

    const guestLines: Array<{ k: string; v: string; bold?: boolean }> = [
      { k: "", v: guestName, bold: true },
    ];
    if (guestEmail && guestEmail !== "N/A") guestLines.push({ k: "Email : ", v: guestEmail });
    if (guestPhone) guestLines.push({ k: "Tel. : ", v: guestPhone });
    guestLines.push({ k: "Role : ", v: "Locataire / Voyageur" });
    guestLines.push({ k: "Piece d'identite : ", v: idType });

    drawPartyCard(M, "BAILLEUR (HOTE)", hostLines);
    drawPartyCard(M + halfW + 12, "LOCATAIRE (INVITE)", guestLines);
    y -= partyH + 16;

    // ─────────────────────────────────────────────────────────
    // PROPERTY & RESERVATION CARD
    // ─────────────────────────────────────────────────────────
    sectionHeader("Bien et sejour", "Details de la location");

    const propertyH = 96;
    R(M, y, CW, propertyH, BLUE_SOFT, BLUE_M, 0.6);
    const topY = y;
    const col2X = M + CW / 2 + 8;

    T("PROPRIETE", M + 12, topY - 13, 7.5, fontB, BLUE);
    const pnTrunc = propName.length > 46 ? propName.slice(0, 44) + "..." : propName;
    T(pnTrunc, M + 12, topY - 28, 10, fontB, INK);
    T(propAddr, M + 12, topY - 42, 8, font, GRAY_1);
    if (propCountry) T(propCountry, M + 12, topY - 54, 8, font, GRAY_1);
    if (property?.rooms_count || property?.max_guests) {
      const propMeta = `${property?.rooms_count ?? "?"} chambre(s) - Capacite max. ${property?.max_guests ?? "?"} pers.`;
      T(propMeta, M + 12, topY - 68, 7.5, font, GRAY_2);
    }

    page.drawLine({
      start: { x: M + CW / 2, y: topY - 10 },
      end:   { x: M + CW / 2, y: topY - propertyH + 10 },
      thickness: 0.5, color: BLUE_M,
    });

    T("SEJOUR", col2X, topY - 13, 7.5, fontB, BLUE);
    const resLines: Array<[string, string]> = [
      ["Reference",  bookRef],
      ["Arrivee",    `${checkIn} a ${checkInTime}`],
      ["Depart",     `${checkOut} a ${checkOutTime}`],
      ["Voyageurs",  `${nbGuests} personne(s)`],
    ];
    let rly = topY - 28;
    for (const [k, v] of resLines) {
      T(k, col2X, rly, 7.5, font, GRAY_2);
      T(v, col2X + 65, rly, 8.5, fontB, INK);
      rly -= 12;
    }
    y -= propertyH + 16;

    // ─────────────────────────────────────────────────────────
    // CONTRACT BODY
    // ─────────────────────────────────────────────────────────
    sectionHeader("Termes du contrat", "Clauses contractuelles convenues");

    const bodyLines = wrap(contractContent, 92);
    for (const line of bodyLines) {
      ensureSpace(14);
      if (!line.trim()) { y -= 6; continue; }
      if (/^---+$/.test(line.trim()) || /^--+$/.test(line.trim())) {
        y -= 3; HL(y, M + 30, CW - 60, 0.4, GRAY_3); y -= 8; continue;
      }
      const isArticle = /^(article|art\.?)\s*\d+/i.test(line.trim());
      const isNumbered = /^\d+[.)]/.test(line.trim());
      const isHeading = /^[A-Z\s]{6,}$/.test(line.trim()) && line.trim().length < 60;
      if (isArticle) {
        y -= 4;
        ensureSpace(20);
        R(M, y + 1, 3, 12, BLUE);
        T(line, M + 9, y - 9, 9.5, fontB, NAVY);
        y -= 16;
      } else if (isHeading) {
        y -= 2;
        T(line, M, y - 8, 9.5, fontB, NAVY);
        y -= 14;
      } else if (isNumbered) {
        T(line, M + 6, y, 9, font, INK);
        y -= 13;
      } else {
        T(line, M, y, 9, font, INK);
        y -= 13;
      }
    }
    y -= 10;

    // ─────────────────────────────────────────────────────────
    // ELECTRONIC SIGNATURE CLAUSE (Morocco law 53-05)
    // ─────────────────────────────────────────────────────────
    ensureSpace(130);
    sectionHeader("Signature electronique", "Clause juridique - Loi n° 53-05");

    const clauseLines = [
      "Les parties reconnaissent expressement que la signature electronique apposee sur le present contrat a,",
      "conformement a la loi marocaine n° 53-05 du 30 novembre 2007 relative a l'echange electronique de",
      "donnees juridiques, la meme valeur juridique qu'une signature manuscrite. Les parties conviennent que :",
      "",
      " -  L'identite du locataire est verifiee par analyse automatisee de sa piece d'identite officielle",
      "    (procedure KYC) avant signature du contrat.",
      " -  L'horodatage du systeme, l'adresse IP et l'empreinte du terminal utilise par le signataire sont",
      "    enregistres dans une piste d'audit securisee afin d'etablir la preuve probante de l'acte.",
      " -  L'integrite du document signe est garantie par une empreinte cryptographique SHA-256 calculee",
      "    sur l'ensemble du contenu du contrat, des signatures et de leur horodatage. Toute modification",
      "    ulterieure du document romprait cette empreinte et rendrait le document non opposable.",
      " -  Le consentement electronique est exprime par la coche explicite et la signature numerique apposees",
      "    par chacune des parties, apres lecture complete du present contrat.",
    ];
    for (const l of clauseLines) {
      ensureSpace(11);
      if (!l.trim()) { y -= 4; continue; }
      T(l, M, y, 8.5, font, INK);
      y -= 11;
    }
    y -= 8;

    // ─────────────────────────────────────────────────────────
    // SIGNATURE PANELS
    // ─────────────────────────────────────────────────────────
    ensureSpace(180);
    sectionHeader("Signatures des parties", "Preuve electronique");

    const sigBoxW = Math.floor((CW - 12) / 2);
    const sigBoxH = 160;
    const sigTopY = y;
    ensureSpace(sigBoxH + 10);
    const sigY = y;

    const drawSigPanel = async (
      panelX: number,
      label: string,
      signerName: string,
      subtitle: string | null,
      sigDataUrl: string | null,
      sigDate: string | null,
      detailRows: Array<[string, string]>,
      pending: boolean,
    ) => {
      R(panelX, sigY, sigBoxW, sigBoxH, WHITE, GRAY_3, 0.8);
      R(panelX, sigY, sigBoxW, 24, NAVY);
      T(label, panelX + 10, sigY - 9, 8.5, fontB, WHITE);
      const sn = signerName.length > 36 ? signerName.slice(0, 34) + "..." : signerName;
      T(sn, panelX + 10, sigY - 36, 9.5, fontB, INK);
      if (subtitle) T(subtitle, panelX + 10, sigY - 49, 7.5, font, GRAY_2);

      // Signature image area
      const imgAreaTop = sigY - 52;
      const imgAreaH = 50;
      R(panelX + 10, imgAreaTop, sigBoxW - 20, imgAreaH, rgb(0.978, 0.982, 0.996));

      if (sigDataUrl && sigDataUrl.startsWith("data:")) {
        const b64m = sigDataUrl.match(/base64,(.+)$/);
        if (b64m) {
          try {
            const isPng = sigDataUrl.includes("image/png");
            let sigBytes = Uint8Array.from(atob(b64m[1]), (c) => c.charCodeAt(0));
            if (isPng) sigBytes = blueifyPNG(sigBytes);
            const sigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
            const maxW = sigBoxW - 28, maxH = imgAreaH - 6;
            const scale = Math.min(maxW / sigImg.width, maxH / sigImg.height, 1);
            const sw = sigImg.width * scale, sh = sigImg.height * scale;
            const imgX = panelX + (sigBoxW - sw) / 2;
            const imgY = imgAreaTop - (imgAreaH - sh) / 2 - sh;
            page.drawImage(sigImg, { x: imgX, y: imgY, width: sw, height: sh });
          } catch (e) {
            console.error("sig embed error:", e);
            T("[Signature enregistree]", panelX + 12, imgAreaTop - imgAreaH / 2 - 2, 8, font, GRAY_2);
          }
        }
      } else if (pending) {
        const pt = "En attente de signature";
        T(pt, panelX + (sigBoxW - Tw(pt, 9, fontI)) / 2, imgAreaTop - imgAreaH / 2 + 2, 9, fontI, GRAY_2);
      }

      // Details grid
      let dy = imgAreaTop - imgAreaH - 8;
      for (const [k, v] of detailRows) {
        if (dy < sigY - sigBoxH + 8) break;
        T(k, panelX + 10, dy, 6.5, font, GRAY_2);
        const vText = v.length > 42 ? v.slice(0, 40) + "..." : v;
        T(vText, panelX + 10 + 62, dy, 7, fontB, INK);
        dy -= 9;
      }
    };

    // Guest panel
    await drawSigPanel(
      M,
      "LOCATAIRE",
      guestName,
      signedAt ? `Signe le ${signedAt}` : null,
      contract.guest_signature_url || null,
      signedAt,
      [
        ["Identite", `KYC ${kycStatus} (${kycConfidence})`],
        ["Document", idType],
        ["Adresse IP", guestIP],
        ["Appareil", guestDev.device],
        ["Navigateur", `${guestDev.browser} - ${guestDev.os}`],
      ],
      !contract.signed_by_guest,
    );

    // Host panel — audit data may be absent, use contract update time
    const hostAudit = (auditLogs || []).filter((a) => a.signer_role === "host").slice(-1)[0];
    const hostIP = (hostAudit?.ip_address || "").split(",")[0].trim() || "—";
    const hostUA = hostAudit?.user_agent || "";
    const hostDev = deviceFromUA(hostUA);
    await drawSigPanel(
      M + sigBoxW + 12,
      "BAILLEUR",
      hostName,
      hostSignedAt ? `Signe le ${hostSignedAt}` : null,
      contract.host_signature_url || null,
      hostSignedAt,
      [
        ["Role", "Bailleur / Hote"],
        ["Email", hostEmail || "—"],
        ["Adresse IP", hostIP],
        ["Appareil", hostDev.device === "Inconnu" ? "—" : hostDev.device],
        ["Navigateur", hostDev.browser === "Inconnu" ? "—" : `${hostDev.browser} - ${hostDev.os}`],
      ],
      !contract.signed_by_host,
    );

    y = sigY - sigBoxH - 16;

    // ─────────────────────────────────────────────────────────
    // PROOF BLOCK — binds signature to document
    // ─────────────────────────────────────────────────────────
    ensureSpace(80);
    sectionHeader("Traçabilite du document", "Lien signature / contenu");

    const proofBoxH = 66;
    R(M, y, CW, proofBoxH, GRAY_BG, GRAY_3, 0.6);
    const py = y - 14;
    const pLeft = M + 14;
    T("Document signe electroniquement le", pLeft, py, 7.5, font, GRAY_1);
    T(signedAt || "—", pLeft + 156, py, 8, fontB, INK);
    T("par", pLeft + 156 + Tw(signedAt || "—", 8, fontB) + 6, py, 7.5, font, GRAY_1);
    T(guestName, pLeft + 156 + Tw(signedAt || "—", 8, fontB) + 24, py, 8, fontB, INK);

    T("Identite verifiee via", pLeft, py - 14, 7.5, font, GRAY_1);
    T(idType, pLeft + 92, py - 14, 8, fontB, INK);

    T("Empreinte numerique (SHA-256) :", pLeft, py - 28, 7.5, font, GRAY_1);
    T(contentHash, pLeft, py - 40, 7, fontM, NAVY);
    T("Cette empreinte garantit l'integrite du contrat : toute modification ulterieure la rompt.", pLeft, py - 52, 6.5, fontI, GRAY_2);
    y -= proofBoxH + 14;

    // ─────────────────────────────────────────────────────────
    // AUDIT TRAIL — structured table
    // ─────────────────────────────────────────────────────────
    ensureSpace(90);
    sectionHeader("Piste d'audit", "Journal chronologique des evenements");

    // Table header
    const colX = [M + 8, M + 110, M + 220, M + 310, M + 420];
    const colW = [102, 110, 90, 110, CW - (M + 420 - M) - 8];
    const rowH = 14;

    R(M, y, CW, 22, AUDIT_BG);
    T("HORODATAGE", colX[0], y - 8, 7, fontB, WHITE);
    T("EVENEMENT", colX[1], y - 8, 7, fontB, WHITE);
    T("ROLE", colX[2], y - 8, 7, fontB, WHITE);
    T("ADRESSE IP", colX[3], y - 8, 7, fontB, WHITE);
    T("DETAIL", colX[4], y - 8, 7, fontB, WHITE);
    y -= 22;

    const eventLabel = (e: string): string => {
      switch (e) {
        case "identity_submitted": return "Document d'identite soumis";
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
      T("Aucun evenement enregistre.", colX[0], y - 9, 7.5, fontI, GRAY_2);
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
        R(M, y, CW, rowH, altRow ? GRAY_BG : WHITE, GRAY_3, 0.2);
        T(ts, colX[0], y - 9, 6.5, fontM, INK);
        T(ev.length > 28 ? ev.slice(0, 27) + "…" : ev, colX[1], y - 9, 6.8, font, INK);
        T(role, colX[2], y - 9, 6.8, font, GRAY_1);
        T(ip, colX[3], y - 9, 6.5, fontM, GRAY_1);
        T(detail.length > 22 ? detail.slice(0, 20) + ".." : detail, colX[4], y - 9, 6.5, font, GRAY_1);
        y -= rowH;
        altRow = !altRow;
      }
    }
    y -= 12;

    // ─────────────────────────────────────────────────────────
    // Legal reminder footer paragraph
    // ─────────────────────────────────────────────────────────
    ensureSpace(36);
    HL(y, M, CW, 0.4, GRAY_3);
    y -= 10;
    T("Document genere electroniquement conformement a la loi marocaine n° 53-05 du 30 novembre 2007",
      M, y, 7.5, font, GRAY_1);
    y -= 10;
    T("relative a l'echange electronique de donnees juridiques. La signature electronique a la meme valeur",
      M, y, 7.5, font, GRAY_1);
    y -= 10;
    T("juridique qu'une signature manuscrite (art. 417-1 et suivants du Dahir des obligations et des contrats).",
      M, y, 7.5, font, GRAY_1);

    // ─────────────────────────────────────────────────────────
    // FOOTER on every page — Page X / Y
    // ─────────────────────────────────────────────────────────
    const total = pdfDoc.getPageCount();
    for (let i = 0; i < total; i++) {
      const p = pdfDoc.getPage(i);
      p.drawLine({
        start: { x: M, y: M + 22 }, end: { x: PW - M, y: M + 22 },
        thickness: 0.5, color: GRAY_3,
      });
      // Left footer: branding + legal
      p.drawText("HostCheckIn", {
        x: M, y: M + 10, size: 7, font: fontB, color: NAVY,
      });
      p.drawText("Signature electronique - Loi marocaine n° 53-05", {
        x: M + Tw("HostCheckIn", 7, fontB) + 6, y: M + 10, size: 7, font, color: GRAY_1,
      });
      // Center: ref
      const midT = `Ref. ${bookRef}`;
      p.drawText(midT, {
        x: (PW - Tw(midT, 7, font)) / 2, y: M + 10, size: 7, font, color: GRAY_2,
      });
      // Right: Page X / Y
      const pg = `Page ${i + 1} / ${total}`;
      p.drawText(pg, {
        x: PW - M - Tw(pg, 7.5, fontB), y: M + 10, size: 7.5, font: fontB, color: NAVY,
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
