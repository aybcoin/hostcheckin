import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const contract_id = url.searchParams.get("contract_id");

    if (!contract_id) {
      return new Response(
        JSON.stringify({ error: "contract_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use the caller's JWT so RLS enforces who can read which contract.
    // This blocks host A from downloading host B's contract even if they
    // guess the contract_id.
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: contract, error } = await supabase
      .from("contracts")
      .select("id, reservation_id, pdf_storage_path, content_hash, pdf_bytes_hash, locked")
      .eq("id", contract_id)
      .maybeSingle();

    if (error || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!contract.pdf_storage_path) {
      return new Response(
        JSON.stringify({ error: "PDF not generated yet" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Elevate to service role only to read the file bytes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: blob, error: dlErr } = await serviceClient.storage
      .from("contract-pdfs")
      .download(contract.pdf_storage_path);

    if (dlErr || !blob) {
      return new Response(
        JSON.stringify({ error: "Failed to read PDF from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Re-compute hash on the current bytes and verify against stored hash.
    // Mismatch = the PDF was tampered with in storage → refuse to serve.
    const currentHash = await sha256Hex(bytes);
    const integrityOk = !contract.pdf_bytes_hash ||
      currentHash === contract.pdf_bytes_hash;

    if (!integrityOk) {
      // Append-only audit entry, then refuse. This is a legal signal.
      await serviceClient.from("signature_audit_log").insert({
        contract_id: contract.id,
        reservation_id: contract.reservation_id,
        event_type: "pdf_downloaded",
        signer_role: "system",
        metadata: {
          integrity_ok: false,
          expected_hash: contract.pdf_bytes_hash,
          actual_hash: currentHash,
          reason: "hash_mismatch_refused",
        },
      });
      return new Response(
        JSON.stringify({
          error: "Integrity check failed — PDF refused.",
          expected_hash: contract.pdf_bytes_hash,
          actual_hash: currentHash,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ip_address = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const user_agent = req.headers.get("user-agent") || "unknown";

    // Log the download as an audit event (append-only, service role bypasses RLS)
    await serviceClient.from("signature_audit_log").insert({
      contract_id: contract.id,
      reservation_id: contract.reservation_id,
      event_type: "pdf_downloaded",
      signer_role: "host",
      ip_address,
      user_agent,
      metadata: {
        pdf_bytes_hash: currentHash,
        content_hash_stored: contract.content_hash,
        integrity_ok: true,
        locked: contract.locked,
      },
    });

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrat-${contract.id}.pdf"`,
        "X-Content-Hash": currentHash,
        "X-Integrity-OK": "true",
      },
    });
  } catch (e) {
    console.error("download-contract-pdf error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
