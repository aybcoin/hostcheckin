import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AirbnbData {
  name: string;
  address: string;
  city: string;
  country: string;
  rooms_count: number;
  bathrooms_count: number;
  max_guests: number;
  description: string;
  image_url?: string;
  amenities?: string[];
}

async function scrapeAirbnbListing(listingId: string): Promise<AirbnbData> {
  try {
    const url = `https://www.airbnb.com/rooms/${listingId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Airbnb listing: ${response.status}`);
    }

    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].split(' - ')[0] : `Propriété Airbnb ${listingId}`;

    const locationMatch = html.match(/"city":"(.*?)"/);
    const countryMatch = html.match(/"country":"(.*?)"/);
    const city = locationMatch ? locationMatch[1] : 'Paris';
    const country = countryMatch ? countryMatch[1] : 'France';

    const guestsMatch = html.match(/"personCapacity":(\d+)/);
    const bedroomsMatch = html.match(/"bedrooms":(\d+)/);
    const bathroomsMatch = html.match(/"bathrooms":(\d+(?:\.\d+)?)/);

    const max_guests = guestsMatch ? parseInt(guestsMatch[1]) : 2;
    const rooms_count = bedroomsMatch ? parseInt(bedroomsMatch[1]) : 1;
    const bathrooms_count = bathroomsMatch ? Math.ceil(parseFloat(bathroomsMatch[1])) : 1;

    const descriptionMatch = html.match(/"description":"(.*?)"/);
    const description = descriptionMatch
      ? descriptionMatch[1].replace(/\\n/g, ' ').substring(0, 500)
      : 'Propriété importée depuis Airbnb';

    const imageMatch = html.match(/"picture":"(https:\/\/[^"]+)"/);
    const image_url = imageMatch ? imageMatch[1] : undefined;

    const amenitiesMatches = html.matchAll(/"title":"(.*?)"/g);
    const amenities: string[] = [];
    for (const match of amenitiesMatches) {
      if (amenities.length < 10) {
        amenities.push(match[1]);
      }
    }

    return {
      name: title,
      address: `${city}`,
      city: city,
      country: country,
      rooms_count: rooms_count || 1,
      bathrooms_count: bathrooms_count || 1,
      max_guests: max_guests || 2,
      description: description,
      image_url: image_url,
      amenities: amenities.length > 0 ? amenities : ['WiFi', 'Cuisine équipée'],
    };
  } catch (error) {
    console.error('Error scraping Airbnb:', error);

    return {
      name: `Propriété Airbnb ${listingId}`,
      address: 'À compléter',
      city: 'Paris',
      country: 'France',
      rooms_count: 2,
      bathrooms_count: 1,
      max_guests: 4,
      description: 'Propriété importée depuis Airbnb - Veuillez compléter les informations',
      amenities: ['WiFi', 'Cuisine équipée', 'TV', 'Chauffage'],
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { listingId } = await req.json();

    if (!listingId) {
      return new Response(
        JSON.stringify({ error: 'listingId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await scrapeAirbnbListing(listingId);

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
