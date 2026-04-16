import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  verification_id?: string;
  reservation_id: string;
  guest_id?: string;
  id_document_url: string;
  id_back_url?: string;
  selfie_url?: string;
  declared_name: string;
  id_type: string;
}

interface OcrResult {
  raw_text: string;
  lines: string[];
  success: boolean;
  error: string | null;
  provider: string;
}

interface DocumentAnalysis {
  is_valid_document: boolean;
  document_type_detected: string;
  confidence: number;
  extracted_name: string | null;
  extracted_document_number: string | null;
  name_match_score: number;
  matched_keywords: string[];
  rejection_reasons: string[];
  ocr: OcrResult;
}

function summarizeUrl(input: string): string {
  try {
    const parsed = new URL(input);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return input.slice(0, 120);
  }
}

// ---------- Text normalization helpers ----------

function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0).map((_, i) => i);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

// Token-set match: every token of declaredName must have a close match
// (Levenshtein <= 2) in the OCR text. Returns score in [0,1].
function nameMatchScore(declaredName: string, ocrText: string): {
  score: number;
  matchedTokens: string[];
} {
  const declared = normalizeName(declaredName);
  const ocr = normalizeName(ocrText);
  if (!declared || !ocr) return { score: 0, matchedTokens: [] };

  const declaredTokens = declared.split(" ").filter((t) => t.length >= 2);
  const ocrTokens = ocr.split(" ").filter((t) => t.length >= 2);
  if (declaredTokens.length === 0 || ocrTokens.length === 0) {
    return { score: 0, matchedTokens: [] };
  }

  const matched: string[] = [];
  for (const token of declaredTokens) {
    const tol = token.length <= 4 ? 1 : 2;
    const hit = ocrTokens.find((ot) => {
      if (ot === token) return true;
      if (Math.abs(ot.length - token.length) > tol) return false;
      return levenshtein(ot, token) <= tol;
    });
    if (hit) matched.push(token);
  }

  return {
    score: matched.length / declaredTokens.length,
    matchedTokens: matched,
  };
}

// ---------- Document keywords ----------

const DOCUMENT_KEYWORDS: Record<string, string[]> = {
  cin: [
    "CARTE NATIONALE",
    "IDENTITE",
    "IDENTITY CARD",
    "REPUBLIQUE FRANCAISE",
    "NATIONALITE",
    "IDFRA",
  ],
  passport: [
    "PASSPORT",
    "PASSEPORT",
    "REPUBLIQUE FRANCAISE",
    "TYPE/TYPE",
    "P<",
    "CODE PAYS",
  ],
  driver_license: [
    "PERMIS DE CONDUIRE",
    "DRIVING LICENCE",
    "DRIVER",
    "CATEGORIE",
  ],
  sejour: [
    "TITRE DE SEJOUR",
    "CARTE DE SEJOUR",
    "RESIDENCE PERMIT",
    "PREFECTURE",
  ],
};

function detectKeywords(text: string, idType: string): string[] {
  const upper = normalizeName(text);
  const keywords = DOCUMENT_KEYWORDS[idType] || [];
  const found: string[] = [];
  for (const kw of keywords) {
    if (upper.includes(normalizeName(kw))) found.push(kw);
  }
  return found;
}

// ---------- OCR.space call ----------

async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error("verify-identity image download failed:", {
      imageUrl: summarizeUrl(imageUrl),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function callOcrSpace(imageUrl: string): Promise<OcrResult> {
  const apiKey = Deno.env.get("OCR_SPACE_API_KEY") || "helloworld";
  try {
    console.info("verify-identity OCR start", {
      provider: "ocr.space",
      imageUrl: summarizeUrl(imageUrl),
    });

    // Download image and send as base64 — more reliable than passing URL
    const imageData = await downloadImageAsBase64(imageUrl);
    if (!imageData) {
      console.warn("verify-identity OCR aborted: image download unavailable", {
        imageUrl: summarizeUrl(imageUrl),
      });
      return {
        raw_text: "",
        lines: [],
        success: false,
        error: "Failed to download image for OCR",
        provider: "ocr.space",
      };
    }

    const base64String = `data:${imageData.mimeType};base64,${imageData.base64}`;

    const formData = new FormData();
    formData.append("base64Image", base64String);
    formData.append("language", "fre");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const resp = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: apiKey },
      body: formData,
    });

    if (!resp.ok) {
      console.warn("verify-identity OCR HTTP error", {
        status: resp.status,
        imageUrl: summarizeUrl(imageUrl),
      });
      return {
        raw_text: "",
        lines: [],
        success: false,
        error: `OCR HTTP ${resp.status}`,
        provider: "ocr.space",
      };
    }

    const json = await resp.json();
    if (json.IsErroredOnProcessing) {
      const errorMessage = Array.isArray(json.ErrorMessage)
        ? json.ErrorMessage.join(" | ")
        : String(json.ErrorMessage || "unknown");
      console.warn("verify-identity OCR processing error", {
        imageUrl: summarizeUrl(imageUrl),
        error: errorMessage,
      });
      return {
        raw_text: "",
        lines: [],
        success: false,
        error: errorMessage,
        provider: "ocr.space",
      };
    }

    const parsed = (json.ParsedResults || [])
      .map((r: { ParsedText?: string }) => r.ParsedText || "")
      .join("\n");

    const lines = parsed
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    console.info("verify-identity OCR complete", {
      imageUrl: summarizeUrl(imageUrl),
      success: parsed.length > 0,
      lineCount: lines.length,
      textLength: parsed.length,
    });

    return {
      raw_text: parsed,
      lines,
      success: parsed.length > 0,
      error: parsed.length === 0 ? "Empty OCR result" : null,
      provider: "ocr.space",
    };
  } catch (e) {
    console.error("verify-identity OCR request failed:", {
      imageUrl: summarizeUrl(imageUrl),
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      raw_text: "",
      lines: [],
      success: false,
      error: (e as Error).message,
      provider: "ocr.space",
    };
  }
}

// ---------- Full analysis ----------

async function analyzeDocument(
  imageUrl: string,
  idType: string,
  declaredName: string,
): Promise<DocumentAnalysis> {
  const rejectionReasons: string[] = [];

  const ocr = await callOcrSpace(imageUrl);

  if (!ocr.success) {
    return {
      is_valid_document: false,
      document_type_detected: "unknown",
      confidence: 0,
      extracted_name: null,
      extracted_document_number: null,
      name_match_score: 0,
      matched_keywords: [],
      rejection_reasons: [
        `Lecture OCR impossible (${ocr.error || "inconnue"}). Veuillez fournir une photo nette et bien eclairee.`,
      ],
      ocr,
    };
  }

  const matchedKeywords = detectKeywords(ocr.raw_text, idType);
  if (matchedKeywords.length === 0) {
    rejectionReasons.push(
      "Le document ne semble pas etre une piece d'identite du type declare (aucun mot-cle reconnu).",
    );
  }

  // Name match
  const nameResult = nameMatchScore(declaredName, ocr.raw_text);
  if (nameResult.score < 0.5) {
    rejectionReasons.push(
      `Le nom declare ne correspond pas au nom figurant sur le document (score ${(nameResult.score * 100).toFixed(0)}%).`,
    );
  }

  // Extracted name: best-effort — the longest uppercase line that contains at least one matched token
  const declaredNorm = normalizeName(declaredName);
  const declaredTokens = declaredNorm.split(" ").filter((t) => t.length >= 2);
  const candidateLines = ocr.lines
    .map((l) => normalizeName(l))
    .filter((l) => l.length >= 4 && /^[A-Z ]+$/.test(l));
  let extractedName: string | null = null;
  for (const line of candidateLines) {
    if (declaredTokens.some((t) => line.includes(t))) {
      extractedName = line;
      break;
    }
  }
  if (!extractedName && candidateLines.length > 0) {
    extractedName = candidateLines.sort((a, b) => b.length - a.length)[0];
  }

  // Document number: first alphanumeric token 6..12 chars with at least one digit
  let docNumber: string | null = null;
  const numRegex = /\b([A-Z0-9]{6,12})\b/g;
  const upperText = ocr.raw_text.toUpperCase();
  let m: RegExpExecArray | null;
  while ((m = numRegex.exec(upperText)) !== null) {
    if (/[0-9]/.test(m[1])) {
      docNumber = m[1];
      break;
    }
  }

  // Confidence score combining keywords + name match
  const kwScore = Math.min(matchedKeywords.length / 2, 1); // 2+ keywords = full
  const confidence = Math.round((kwScore * 0.5 + nameResult.score * 0.5) * 100) / 100;

  const documentTypeMap: Record<string, string> = {
    cin: "carte_identite",
    passport: "passeport",
    driver_license: "permis_conduire",
    sejour: "titre_sejour",
  };

  const isValid = rejectionReasons.length === 0 && confidence >= 0.6;

  return {
    is_valid_document: isValid,
    document_type_detected: documentTypeMap[idType] || idType,
    confidence,
    extracted_name: extractedName,
    extracted_document_number: docNumber,
    name_match_score: nameResult.score,
    matched_keywords: matchedKeywords,
    rejection_reasons: rejectionReasons,
    ocr,
  };
}

// ---------- HTTP handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: VerifyRequest = await req.json();
    const {
      reservation_id,
      guest_id,
      id_document_url,
      id_back_url,
      selfie_url,
      declared_name,
      id_type,
      // Legacy field — ignored if present; we create the record ourselves
      verification_id: _legacy_vid,
    } = body;

    if (!reservation_id || !id_document_url || !declared_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.info("verify-identity request received", {
      reservation_id,
      guest_id: guest_id || null,
      id_type: id_type || "unknown",
      has_back: !!id_back_url,
      has_selfie: !!selfie_url,
      id_document_url: summarizeUrl(id_document_url),
    });

    // Create the identity_verification record server-side (bypasses RLS)
    const { data: newVer, error: insertError } = await supabase
      .from("identity_verification")
      .insert({
        reservation_id,
        guest_id: guest_id || null,
        id_type: id_type || "unknown",
        id_document_url,
        id_back_url: id_back_url || null,
        selfie_url: selfie_url || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !newVer) {
      console.error("Error creating verification record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const verification_id = newVer.id;
    console.info("verify-identity record created", {
      reservation_id,
      verification_id,
    });

    const ip_address = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const user_agent = req.headers.get("user-agent") || "unknown";

    const analysis = await analyzeDocument(id_document_url, id_type, declared_name);
    console.info("verify-identity analysis complete", {
      reservation_id,
      verification_id,
      ocr_success: analysis.ocr.success,
      confidence: analysis.confidence,
      rejection_reasons: analysis.rejection_reasons.length,
      matched_keywords: analysis.matched_keywords.length,
    });

    // Fail-closed: no OCR → pending (manual review), never approved
    let status: string;
    let rejection_reason: string | null = null;
    const requiresManualReview = !analysis.ocr.success;

    if (requiresManualReview) {
      status = "pending";
      rejection_reason = "Verification necessitant une revue manuelle par l'hote.";
    } else if (analysis.rejection_reasons.length > 0) {
      status = "rejected";
      rejection_reason = analysis.rejection_reasons.join(" ");
    } else if (analysis.is_valid_document && analysis.confidence >= 0.75) {
      status = "approved";
    } else {
      status = "pending";
      rejection_reason = "Verification necessitant une revue manuelle par l'hote.";
    }

    const ocrData = {
      provider: analysis.ocr.provider,
      ocr_success: analysis.ocr.success,
      ocr_error: analysis.ocr.error,
      ocr_raw_text: analysis.ocr.raw_text,
      ocr_lines: analysis.ocr.lines,
      declared_name,
      declared_name_normalized: normalizeName(declared_name),
      extracted_name: analysis.extracted_name,
      name_match_score: analysis.name_match_score,
      document_number: analysis.extracted_document_number,
      document_type_detected: analysis.document_type_detected,
      matched_keywords: analysis.matched_keywords,
      confidence: analysis.confidence,
      rejection_reasons: analysis.rejection_reasons,
      has_back: !!id_back_url,
      has_selfie: !!selfie_url,
      ip_address,
      user_agent,
      analysis_timestamp: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("identity_verification")
      .update({
        status,
        ocr_data: ocrData,
        document_confidence: analysis.confidence,
        face_match_score: null,
        rejection_reason,
        ip_address,
        user_agent,
        detected_document_type: analysis.document_type_detected,
      })
      .eq("id", verification_id);

    if (updateError) {
      console.error("Error updating verification:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update verification record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Audit trail entry — server-side, with real IP/UA (pièce probante)
    await supabase.from("signature_audit_log").insert({
      reservation_id,
      event_type: "identity_verification_processed",
      signer_role: "system",
      ip_address,
      user_agent,
      metadata: {
        verification_id,
        status,
        confidence: analysis.confidence,
        name_match_score: analysis.name_match_score,
        matched_keywords: analysis.matched_keywords,
        rejection_reason,
        id_type,
      },
    });
    console.info("verify-identity status decided", {
      reservation_id,
      verification_id,
      status,
      requires_manual_review: requiresManualReview,
      confidence: analysis.confidence,
    });

    // Only move reservation forward if approved or pending (manual review)
    // Rejected submissions do NOT progress the reservation.
    if (status === "approved" || status === "pending") {
      await supabase
        .from("reservations")
        .update({ status: "checked_in" })
        .eq("id", reservation_id)
        .eq("status", "pending");
    }

    return new Response(
      JSON.stringify({
        verification_id,
        status,
        confidence: analysis.confidence,
        is_valid_document: analysis.is_valid_document,
        name_match_score: analysis.name_match_score,
        matched_keywords: analysis.matched_keywords,
        requires_manual_review: requiresManualReview,
        rejection_reason,
        ocr_data: {
          extracted_name: analysis.extracted_name,
          document_number: analysis.extracted_document_number,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Verify identity error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
