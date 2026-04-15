import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { inflate as pakoInflate, deflate as pakoDeflate } from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Colors ────────────────────────────────────────────────────────
const NAVY    = rgb(0.086, 0.184, 0.353);
const BLUE    = rgb(0.196, 0.451, 0.741);
const BLUE_L  = rgb(0.918, 0.941, 0.980);
const BLUE_M  = rgb(0.729, 0.812, 0.918);
const GREEN   = rgb(0.047, 0.565, 0.314);
const GREEN_L = rgb(0.878, 0.965, 0.922);
const DARK    = rgb(0.118, 0.118, 0.165);
const GRAY    = rgb(0.420, 0.435, 0.490);
const LGRAY   = rgb(0.878, 0.882, 0.898);
const AUDBG   = rgb(0.141, 0.165, 0.216);
const WHITE   = rgb(1, 1, 1);

// ── Crypto ────────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Bytes(b: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(buf)).map(b2 => b2.toString(16).padStart(2, "0")).join("");
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

// ── PNG blue-ink processor ────────────────────────────────────────
function u32(buf: Uint8Array, off: number) {
  return ((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]) >>> 0;
}
function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function inflateZ(data: Uint8Array): Uint8Array {
  return pakoInflate(data);
}
function deflateZ(data: Uint8Array): Uint8Array {
  return new Uint8Array(pakoDeflate(data, { level: 6 }));
}
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

    // Colorize: dark strokes → blue ink (R=15 G=45 B=165)
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
    if (contract.locked === true && contract.pdf_storage_path) {
      return new Response(JSON.stringify({
        pdf_storage_path: contract.pdf_storage_path,
        content_hash: contract.content_hash,
        already_sealed: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reservation } = await supabase
      .from("reservations").select("*, guests(*)").eq("id", reservation_id).maybeSingle();
    const propId = reservation?.property_id || contract.property_id;
    const { data: property } = propId
      ? await supabase.from("properties").select("*").eq("id", propId).maybeSingle()
      : { data: null };
    const { data: auditLogs } = await supabase
      .from("signature_audit_log").select("*")
      .eq("reservation_id", reservation_id).order("created_at", { ascending: true });

    const contractContent = contract.contract_content || "Contrat sans contenu";
    const contentHash = await sha256(
      contractContent + (contract.host_signature_url || "") +
      (contract.guest_signature_url || "") + (contract.signed_at || "")
    );

    // ── PDF setup ───────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const PW = 595, PH = 842, M = 40, CW = PW - M * 2;

    let page = pdfDoc.addPage([PW, PH]);
    let y = PH - M;

    // ── Drawing helpers ─────────────────────────────────────────
    const drawFooterOnPage = () => {
      const n = pdfDoc.getPageCount();
      page.drawLine({ start: { x: M, y: M + 20 }, end: { x: PW - M, y: M + 20 }, thickness: 0.5, color: LGRAY });
      page.drawText(`Page ${n}`, { x: PW - M - 30, y: M + 7, size: 7, font, color: GRAY });
      page.drawText("HostCheckIn · Signature electronique · eIDAS UE 910/2014",
        { x: M, y: M + 7, size: 7, font, color: GRAY });
    };

    const ensureSpace = (n: number) => {
      if (y - n < M + 30) {
        drawFooterOnPage();
        page = pdfDoc.addPage([PW, PH]);
        y = PH - M;
      }
    };

    // deno-lint-ignore no-explicit-any
    const T = (t: string, x: number, ty: number, sz: number, f: any, col: any) =>
      page.drawText(clean(t), { x, y: ty, size: sz, font: f, color: col });

    // deno-lint-ignore no-explicit-any
    const R = (x: number, topY: number, w: number, h: number, fill: any, border?: any, bw = 0.8) =>
      page.drawRectangle({ x, y: topY - h, width: w, height: h, color: fill,
        ...(border ? { borderColor: border, borderWidth: bw } : {}) });

    const HL = (ty: number, x = M, w = CW, thick = 0.5, col = LGRAY) =>
      page.drawLine({ start: { x, y: ty }, end: { x: x + w, y: ty }, thickness: thick, color: col });

    // ── Reservation data ────────────────────────────────────────
    const guestName  = reservation?.guests?.full_name || "N/A";
    const guestEmail = reservation?.guests?.email || "N/A";
    const guestPhone = reservation?.guests?.phone || "";
    const propName   = property?.name || "N/A";
    const propAddr   = property ? `${property.address}, ${property.city}` : "N/A";
    const propCountry= property?.country || "";
    const checkIn    = reservation?.check_in_date
      ? new Date(reservation.check_in_date).toLocaleDateString("fr-FR") : "N/A";
    const checkOut   = reservation?.check_out_date
      ? new Date(reservation.check_out_date).toLocaleDateString("fr-FR") : "N/A";
    const nbGuests   = String(reservation?.number_of_guests || "N/A");
    const bookRef    = reservation?.booking_reference || "N/A";
    const signedAt   = contract.signed_at
      ? new Date(contract.signed_at).toLocaleString("fr-FR") : null;

    // ─────────────────────────────────────────────────────────────
    // HEADER (navy bar)
    // ─────────────────────────────────────────────────────────────
    R(0, PH, PW, 72, NAVY);
    R(0, PH - 69, PW, 3, BLUE); // thin accent line

    T("CONTRAT DE LOCATION", M, PH - 24, 16, fontB, WHITE);
    T("COURTE DUREE", M, PH - 44, 11, font, WHITE);

    const refLabel = `Ref. : ${bookRef}`;
    T(refLabel, PW - M - font.widthOfTextAtSize(clean(refLabel), 9), PH - 24, 9, font, WHITE);
    const genLabel = `Genere le ${new Date().toLocaleDateString("fr-FR")}`;
    T(genLabel, PW - M - font.widthOfTextAtSize(clean(genLabel), 8), PH - 37, 8, font, WHITE);

    y = PH - 72 - 14;

    // ─────────────────────────────────────────────────────────────
    // STATUS BADGE
    // ─────────────────────────────────────────────────────────────
    const isSigned = contract.signed_by_guest === true;
    const badgeText = isSigned ? "CONTRAT SIGNE ET VALIDE" : "EN ATTENTE DE SIGNATURE";
    const badgeCol  = isSigned ? GREEN : BLUE;
    const badgeBg   = isSigned ? GREEN_L : BLUE_L;
    const badgeW = 250, badgeH = 22;
    const badgeX = (PW - badgeW) / 2;
    R(badgeX, y, badgeW, badgeH, badgeBg, badgeCol, 1.5);
    const btw = fontB.widthOfTextAtSize(badgeText, 9);
    T(badgeText, badgeX + (badgeW - btw) / 2, y - 7, 9, fontB, badgeCol);
    y -= badgeH + 5;
    if (signedAt) {
      const sdText = `Signe le : ${signedAt}`;
      T(sdText, (PW - font.widthOfTextAtSize(clean(sdText), 8)) / 2, y, 8, font, GRAY);
      y -= 13;
    }
    y -= 10;

    // ─────────────────────────────────────────────────────────────
    // INFO CARD (property + reservation)
    // ─────────────────────────────────────────────────────────────
    const CARD_H = 88;
    R(M, y, CW, CARD_H, BLUE_L, BLUE_M, 0.8);
    const cardTop = y;
    const col2X = M + CW / 2 + 8;

    T("PROPRIETE", M + 10, cardTop - 13, 7.5, fontB, BLUE);
    const pnTrunc = propName.length > 40 ? propName.slice(0, 38) + "..." : propName;
    T(pnTrunc, M + 10, cardTop - 26, 9, fontB, DARK);
    T(propAddr, M + 10, cardTop - 39, 8, font, GRAY);
    if (propCountry) T(propCountry, M + 10, cardTop - 50, 8, font, GRAY);

    page.drawLine({
      start: { x: M + CW / 2, y: cardTop - 8 },
      end:   { x: M + CW / 2, y: cardTop - CARD_H + 8 },
      thickness: 0.5, color: BLUE_M,
    });

    T("RESERVATION", col2X, cardTop - 13, 7.5, fontB, BLUE);
    T(`Reference  : ${bookRef}`,  col2X, cardTop - 26, 8.5, font, DARK);
    T(`Arrivee    : ${checkIn}`,  col2X, cardTop - 38, 8.5, font, DARK);
    T(`Depart     : ${checkOut}`, col2X, cardTop - 50, 8.5, font, DARK);
    T(`Voyageurs  : ${nbGuests}`, col2X, cardTop - 62, 8.5, font, DARK);

    y -= CARD_H + 16;

    // ─────────────────────────────────────────────────────────────
    // PARTIES (side by side)
    // ─────────────────────────────────────────────────────────────
    const halfW = Math.floor((CW - 6) / 2);
    const PARTY_H = 70;

    R(M, y, halfW, PARTY_H, WHITE, LGRAY);
    R(M, y, halfW, 20, NAVY);
    T("PROPRIETAIRE", M + 8, y - 7, 8, fontB, WHITE);
    T(pnTrunc, M + 8, y - 29, 8.5, fontB, DARK);
    T(propAddr, M + 8, y - 41, 7.5, font, GRAY);
    if (propCountry) T(propCountry, M + 8, y - 52, 7.5, font, GRAY);

    const pX2 = M + halfW + 6;
    R(pX2, y, halfW, PARTY_H, WHITE, LGRAY);
    R(pX2, y, halfW, 20, NAVY);
    T("LOCATAIRE", pX2 + 8, y - 7, 8, fontB, WHITE);
    T(guestName, pX2 + 8, y - 29, 8.5, fontB, DARK);
    T(guestEmail, pX2 + 8, y - 41, 7.5, font, GRAY);
    if (guestPhone) T(guestPhone, pX2 + 8, y - 52, 7.5, font, GRAY);

    y -= PARTY_H + 18;

    // ─────────────────────────────────────────────────────────────
    // CONTRACT BODY
    // ─────────────────────────────────────────────────────────────
    HL(y, M, CW, 0.8, BLUE_M);
    y -= 3;
    R(M, y, 4, 16, BLUE);
    T("TERMES DU CONTRAT", M + 10, y - 12, 11, fontB, DARK);
    y -= 20;
    HL(y, M, CW, 0.5, LGRAY);
    y -= 14;

    const bodyLines = wrap(contractContent, 88);
    for (const line of bodyLines) {
      ensureSpace(13);
      if (!line.trim()) { y -= 7; continue; }
      if (/^---+$/.test(line.trim()) || /^--+$/.test(line.trim())) {
        y -= 3; HL(y, M + 20, CW - 40, 0.4, LGRAY); y -= 7; continue;
      }
      const isSecHead = /^\d+[.)]/.test(line.trim());
      if (isSecHead) {
        y -= 3;
        R(M, y + 1, 3, 13, BLUE);
        T(line, M + 8, y - 10, 9.5, fontB, DARK);
        y -= 16;
      } else {
        T(line, M, y, 9, font, DARK);
        y -= 13;
      }
    }
    y -= 16;

    // ─────────────────────────────────────────────────────────────
    // SIGNATURES
    // ─────────────────────────────────────────────────────────────
    ensureSpace(160);
    HL(y, M, CW, 0.8, BLUE_M);
    y -= 3;
    R(M, y, 4, 16, BLUE);
    T("SIGNATURES", M + 10, y - 12, 11, fontB, DARK);
    y -= 20;
    HL(y, M, CW, 0.5, LGRAY);
    y -= 14;

    ensureSpace(130);

    const sigBoxW = Math.floor((CW - 6) / 2);
    const sigBoxH = 120;
    const sigTopY = y;

    const drawSigPanel = async (
      panelX: number,
      label: string,
      signerName: string,
      sigDataUrl: string | null,
      sigDate: string | null,
      pending: boolean,
    ) => {
      R(panelX, sigTopY, sigBoxW, sigBoxH, WHITE, BLUE_M, 1.2);
      R(panelX, sigTopY, sigBoxW, 22, BLUE_L);
      T(label, panelX + 8, sigTopY - 8, 8, fontB, NAVY);
      T(signerName.length > 36 ? signerName.slice(0, 34) + "..." : signerName,
        panelX + 8, sigTopY - 18, 7.5, font, DARK);

      if (sigDataUrl && sigDataUrl.startsWith("data:")) {
        const b64m = sigDataUrl.match(/base64,(.+)$/);
        if (b64m) {
          try {
            const isPng = sigDataUrl.includes("image/png");
            let sigBytes = Uint8Array.from(atob(b64m[1]), c => c.charCodeAt(0));
            if (isPng) sigBytes = blueifyPNG(sigBytes);
            const sigImg = isPng
              ? await pdfDoc.embedPng(sigBytes)
              : await pdfDoc.embedJpg(sigBytes);
            const maxW = sigBoxW - 20, maxH = 55;
            const scale = Math.min(maxW / sigImg.width, maxH / sigImg.height, 1);
            const sw = sigImg.width * scale, sh = sigImg.height * scale;
            const imgX = panelX + (sigBoxW - sw) / 2;
            const imgY = sigTopY - 30 - sh;
            // Light signature bg
            R(panelX + 8, sigTopY - 25, sigBoxW - 16, 60, rgb(0.97, 0.97, 1.0));
            page.drawImage(sigImg, { x: imgX, y: imgY, width: sw, height: sh });
          } catch (e) {
            console.error("sig embed error:", e);
            T("[Signature enregistree]", panelX + 8, sigTopY - 60, 8, font, GRAY);
          }
        }
        if (sigDate) {
          T(`Signe le : ${sigDate}`, panelX + 8, sigTopY - sigBoxH + 22, 7, font, GRAY);
        }
        T("Signature electronique valide", panelX + 8, sigTopY - sigBoxH + 11, 7, font, GREEN);
      } else if (pending) {
        T("En attente de signature", panelX + 8, sigTopY - 68, 8.5, font, GRAY);
      }
    };

    await drawSigPanel(M, "LOCATAIRE", guestName,
      contract.guest_signature_url || null,
      signedAt,
      !contract.signed_by_guest);

    await drawSigPanel(M + sigBoxW + 6, "PROPRIETAIRE",
      propName.length > 34 ? propName.slice(0, 32) + "..." : propName,
      contract.host_signature_url || null,
      contract.signed_by_host && contract.signed_at
        ? new Date(contract.signed_at).toLocaleString("fr-FR") : null,
      !contract.signed_by_host);

    y -= sigBoxH + 20;

    // ─────────────────────────────────────────────────────────────
    // AUDIT TRAIL
    // ─────────────────────────────────────────────────────────────
    ensureSpace(120);

    R(M, y, CW, 26, AUDBG);
    T("PISTE D'AUDIT / AUDIT TRAIL", M + 10, y - 10, 9, fontB, WHITE);
    T(`Hash SHA-256 : ${contentHash}`, M + 10, y - 20, 6.5, font, BLUE_M);
    y -= 26;

    const logs = auditLogs || [];
    const auditLines: string[] = [];
    auditLines.push(`Genere le : ${new Date().toISOString()}`);
    auditLines.push(`Contrat   : ${contract_id}`);
    auditLines.push("");
    for (const entry of logs) {
      const ts = (entry.created_at || "").slice(0, 19).replace("T", " ");
      const ip = (entry.ip_address || "N/A").split(",")[0].trim();
      const line = `[${ts}]  ${entry.event_type || ""}  ${entry.signer_role || ""} ${entry.signer_email || ""}  IP: ${ip}`;
      for (const wl of wrap(line, 100)) auditLines.push(wl);
    }

    const auditBodyH = auditLines.length * 10 + 16;
    if (y - auditBodyH < M + 40) {
      drawFooterOnPage();
      page = pdfDoc.addPage([PW, PH]);
      y = PH - M;
    }
    R(M, y, CW, auditBodyH, rgb(0.967, 0.973, 0.988), LGRAY);
    let ay = y - 10;
    for (const al of auditLines) {
      if (ay < M + 20) break;
      T(al, M + 8, ay, 7, font, GRAY);
      ay -= 10;
    }
    y -= auditBodyH + 14;

    // ─────────────────────────────────────────────────────────────
    // eIDAS note
    // ─────────────────────────────────────────────────────────────
    ensureSpace(30);
    HL(y, M, CW, 0.5, LGRAY);
    y -= 10;
    T("Ce document a ete genere electroniquement conformement au reglement eIDAS (UE 910/2014).",
      M, y, 7.5, font, GRAY);
    y -= 11;
    T("La signature electronique a la meme valeur juridique qu'une signature manuscrite.",
      M, y, 7.5, font, GRAY);

    // Footer on last page
    drawFooterOnPage();

    // ── Save & upload ──────────────────────────────────────────
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

    await supabase.from("contracts").update({
      pdf_storage_path: storagePath, content_hash: contentHash,
      pdf_bytes_hash: pdfBytesHash, pdf_url: storagePath,
      locked: true, sealed_at: new Date().toISOString(),
    }).eq("id", contract_id);

    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await supabase.from("signature_audit_log").insert({
      contract_id, reservation_id, event_type: "pdf_generated", signer_role: "system",
      ip_address, user_agent: req.headers.get("user-agent") || "unknown",
      metadata: { content_hash: contentHash, pdf_bytes_hash: pdfBytesHash,
        pdf_path: storagePath, pdf_size_bytes: pdfBytes.length, sealed: true },
    });

    return new Response(JSON.stringify({
      pdf_storage_path: storagePath, content_hash: contentHash,
      pdf_bytes_hash: pdfBytesHash, pdf_size_bytes: pdfBytes.length, sealed: true,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Generate PDF error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
