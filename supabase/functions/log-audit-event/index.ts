import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AuditRequest {
  contract_id?: string | null;
  reservation_id: string;
  event_type: string;
  signer_role: string;
  signer_email?: string | null;
  signer_name?: string | null;
  consent_text?: string | null;
  metadata?: Record<string, unknown>;
}

const ALLOWED_EVENTS = new Set([
  "identity_submitted",
  "identity_verification_processed",
  "consent_given",
  "signature_drawn",
  "contract_signed",
  "contract_signed_guest",
  "contract_signed_host",
  "contract_viewed",
  "pdf_generated",
  "pdf_downloaded",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: AuditRequest = await req.json();

    if (!body.reservation_id || !body.event_type || !body.signer_role) {
      return new Response(
        JSON.stringify({ error: "reservation_id, event_type and signer_role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ALLOWED_EVENTS.has(body.event_type)) {
      return new Response(
        JSON.stringify({ error: `Unknown event_type: ${body.event_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the reservation actually exists (defence against log pollution)
    const { data: reservation, error: resErr } = await supabase
      .from("reservations")
      .select("id")
      .eq("id", body.reservation_id)
      .maybeSingle();

    if (resErr || !reservation) {
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Capture real IP and user agent server-side — this is the probative value
    const ip_address = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const user_agent = req.headers.get("user-agent") || "unknown";

    const { error: insertErr } = await supabase
      .from("signature_audit_log")
      .insert({
        contract_id: body.contract_id || null,
        reservation_id: body.reservation_id,
        event_type: body.event_type,
        signer_role: body.signer_role,
        signer_email: body.signer_email || null,
        signer_name: body.signer_name || null,
        ip_address,
        user_agent,
        consent_text: body.consent_text || null,
        metadata: body.metadata || {},
      });

    if (insertErr) {
      console.error("Audit log insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to write audit log" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, ip_address, user_agent_captured: !!user_agent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("log-audit-event error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
