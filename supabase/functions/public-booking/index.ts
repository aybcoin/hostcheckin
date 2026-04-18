import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Public-Booking-Csrf",
};

interface BookingBody {
  full_name?: string;
  email?: string;
  phone?: string;
  check_in_date?: string;
  check_out_date?: string;
  number_of_guests?: number;
  captcha_token?: string;
}

function configuredOrigins(): string[] {
  const configured = Deno.env.get("PUBLIC_BOOKING_ALLOWED_ORIGINS");
  if (!configured) return [];
  return configured
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origins = configuredOrigins();
  if (origins.length === 0) {
    return { ...BASE_CORS_HEADERS, "Access-Control-Allow-Origin": "*" };
  }

  const origin = req.headers.get("origin");
  if (!origin || !origins.includes(origin)) {
    return { ...BASE_CORS_HEADERS, "Access-Control-Allow-Origin": origins[0] };
  }

  return {
    ...BASE_CORS_HEADERS,
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

function json(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

function normalize(value: string | null | undefined): string {
  return (value || "").trim();
}

function randomToken(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
}

function generateBookingReference(): string {
  return `${randomToken(4)}#${Math.floor(Math.random() * 10)}`;
}

function generateUniqueLink(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

async function verifyHcaptcha(token: string, remoteIp: string): Promise<boolean> {
  const secret = Deno.env.get("HCAPTCHA_SECRET");
  if (!secret) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", remoteIp);

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.success);
}

function ensureAllowedOrigin(req: Request): boolean {
  const allowed = configuredOrigins();
  if (allowed.length === 0) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return allowed.includes(origin);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, "");
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime());
}

function hasValidCsrfHeader(req: Request): boolean {
  const expected = Deno.env.get("PUBLIC_BOOKING_CSRF_TOKEN");
  if (!expected) return true;
  const provided = req.headers.get("x-public-booking-csrf");
  return Boolean(provided && provided === expected);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeadersFor(req) });
  }

  if (!ensureAllowedOrigin(req)) {
    return json(req, 403, { error: "origin_not_allowed" });
  }

  const url = new URL(req.url);
  const propertyToken = normalize(url.searchParams.get("token"));
  if (!propertyToken) {
    return json(req, 400, { error: "missing_token" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: autoLink, error: autoLinkError } = await supabase
    .from("property_auto_links")
    .select("property_id, host_id, is_active")
    .eq("property_token", propertyToken)
    .maybeSingle();

  if (autoLinkError || !autoLink || !autoLink.is_active) {
    return json(req, 404, { error: "invalid_or_inactive_token" });
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, city, country, verification_mode")
    .eq("id", autoLink.property_id)
    .maybeSingle();

  if (!property) {
    return json(req, 404, { error: "property_not_found" });
  }

  if (req.method === "GET") {
    return json(req, 200, { property });
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "method_not_allowed" });
  }

  if (!hasValidCsrfHeader(req)) {
    return json(req, 403, { error: "invalid_csrf" });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return json(req, 415, { error: "unsupported_media_type" });
  }

  const ipAddressRaw = req.headers.get("x-forwarded-for")
    || req.headers.get("x-real-ip")
    || "unknown";
  const ipAddress = ipAddressRaw.split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") || "unknown";

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: attempts } = await supabase
    .from("public_booking_attempts")
    .select("id", { count: "exact" })
    .eq("ip_address", ipAddress)
    .eq("property_token", propertyToken)
    .gte("created_at", oneHourAgo);

  const attemptsCount = attempts?.length || 0;

  let payload: BookingBody;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "invalid_payload" });
  }

  if (attemptsCount >= 3) {
    const captchaToken = normalize(payload.captcha_token);
    if (!captchaToken) {
      await supabase.from("public_booking_attempts").insert({
        ip_address: ipAddress,
        property_token: propertyToken,
        user_agent: userAgent,
        success: false,
      });
      return json(req, 429, { error: "captcha_required", require_captcha: true });
    }
    const captchaOk = await verifyHcaptcha(captchaToken, ipAddress);
    if (!captchaOk) {
      await supabase.from("public_booking_attempts").insert({
        ip_address: ipAddress,
        property_token: propertyToken,
        user_agent: userAgent,
        success: false,
      });
      return json(req, 429, { error: "invalid_captcha", require_captcha: true });
    }
  }

  const fullName = normalize(payload.full_name);
  const email = normalize(payload.email).toLowerCase();
  const phone = normalizePhone(normalize(payload.phone));
  const checkInDate = normalize(payload.check_in_date);
  const checkOutDate = normalize(payload.check_out_date);
  const numberOfGuests = Number(payload.number_of_guests || 0);

  if (
    !fullName ||
    !email ||
    !phone ||
    !checkInDate ||
    !checkOutDate ||
    !Number.isFinite(numberOfGuests)
  ) {
    return json(req, 400, { error: "missing_required_fields" });
  }

  if (
    fullName.length < 2 ||
    fullName.length > 120 ||
    !validateEmail(email) ||
    phone.length < 6 ||
    phone.length > 30 ||
    !isValidDate(checkInDate) ||
    !isValidDate(checkOutDate) ||
    numberOfGuests <= 0 ||
    numberOfGuests > 20
  ) {
    return json(req, 400, { error: "invalid_input" });
  }

  if (new Date(checkOutDate).getTime() <= new Date(checkInDate).getTime()) {
    return json(req, 400, { error: "invalid_stay_dates" });
  }

  const { data: blacklistRows } = await supabase
    .from("blacklisted_guests")
    .select("id, full_name, email, phone, reason")
    .eq("host_id", autoLink.host_id);

  const normalizedName = fullName.toLowerCase();
  const normalizedPhone = phone.replace(/\s+/g, "");
  const matchedBlacklist = (blacklistRows || []).find((row) => {
    const rowEmail = normalize(row.email).toLowerCase();
    const rowPhone = normalize(row.phone).replace(/\s+/g, "");
    const rowName = normalize(row.full_name).toLowerCase();
    return (rowEmail && rowEmail === email)
      || (rowPhone && rowPhone === normalizedPhone)
      || (rowName && rowName === normalizedName);
  });

  if (matchedBlacklist) {
    await supabase.from("public_booking_attempts").insert({
      ip_address: ipAddress,
      property_token: propertyToken,
      user_agent: userAgent,
      success: false,
    });
    return json(req, 403, { error: "guest_blacklisted" });
  }

  const guestPayload = {
    full_name: fullName,
    email,
    phone,
  };

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .upsert(guestPayload, { onConflict: "email" })
    .select("id")
    .maybeSingle();

  if (guestError || !guest?.id) {
    return json(req, 500, { error: "guest_creation_failed" });
  }

  const verificationMode = normalize(property.verification_mode) === "complete"
    ? "complete"
    : "simple";

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      property_id: property.id,
      guest_id: guest.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      number_of_guests: numberOfGuests,
      booking_reference: generateBookingReference(),
      unique_link: generateUniqueLink(),
      status: "pending",
      verification_type: verificationMode,
      verification_mode: verificationMode,
      notes: "Réservation automatique (lien public propriété)",
    })
    .select("id, unique_link")
    .maybeSingle();

  if (reservationError || !reservation?.unique_link) {
    return json(req, 500, { error: "reservation_creation_failed" });
  }

  await supabase.from("public_booking_attempts").insert({
    ip_address: ipAddress,
    property_token: propertyToken,
    user_agent: userAgent,
    success: true,
  });

  return json(req, 200, {
    success: true,
    unique_link: reservation.unique_link,
    booking_reference: reservation.id,
  });
});
