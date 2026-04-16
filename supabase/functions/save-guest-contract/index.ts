import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SaveGuestContractRequest {
  reservation_id: string;
  unique_link: string;
  contract_content: string;
  guest_signature_url: string;
  signed_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: SaveGuestContractRequest = await req.json();
    const {
      reservation_id,
      unique_link,
      contract_content,
      guest_signature_url,
      signed_at,
    } = body;

    if (!reservation_id || !unique_link || !contract_content || !guest_signature_url) {
      return new Response(
        JSON.stringify({
          error: "reservation_id, unique_link, contract_content and guest_signature_url are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const signedAt = signed_at || new Date().toISOString();

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("id, property_id")
      .eq("id", reservation_id)
      .eq("unique_link", unique_link)
      .maybeSingle();

    if (reservationError || !reservation) {
      console.error("save-guest-contract reservation lookup failed:", reservationError);
      return new Response(
        JSON.stringify({ error: "Reservation not found or link mismatch" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existingContract, error: existingContractError } = await supabase
      .from("contracts")
      .select("id, locked")
      .eq("reservation_id", reservation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingContractError) {
      console.error("save-guest-contract existing contract lookup failed:", existingContractError);
      return new Response(
        JSON.stringify({ error: "Failed to inspect contract state" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (existingContract?.locked) {
      return new Response(
        JSON.stringify({ error: "Contract already sealed and cannot be modified" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (existingContract) {
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          signed_by_guest: true,
          guest_signature_url,
          signed_at: signedAt,
          contract_content,
        })
        .eq("id", existingContract.id);

      if (updateError) {
        console.error("save-guest-contract update failed:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update guest contract" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ contract_id: existingContract.id, created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: newContract, error: insertError } = await supabase
      .from("contracts")
      .insert({
        reservation_id,
        property_id: reservation.property_id,
        contract_type: "rental_agreement",
        pdf_url: "pending",
        signed_by_guest: true,
        signed_by_host: false,
        guest_signature_url,
        signed_at: signedAt,
        contract_content,
      })
      .select("id")
      .single();

    if (insertError || !newContract) {
      console.error("save-guest-contract insert failed:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create guest contract" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ contract_id: newContract.id, created: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("save-guest-contract error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
