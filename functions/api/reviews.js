/**
 * GET /api/reviews — server-side Google Places reviews proxy.
 *
 * Keeps GOOGLE_PLACES_API_KEY server-only (never shipped to the client) and
 * returns the business's real Google rating, total review count, and up to
 * five featured reviews (Google Places Details returns at most five).
 *
 * HONESTY: this endpoint only ever returns what Google actually holds for the
 * configured place. When the env vars are unset, or Google returns nothing,
 * it returns an empty payload and the reviews section renders nothing — no
 * invented reviews, ratings, or counts. Set two vars in Cloudflare Pages →
 * Settings → Environment variables:
 *   GOOGLE_PLACES_API_KEY  (secret; a Google Cloud key with Places API enabled)
 *   GOOGLE_PLACE_ID        (the Place ID for this business's Google profile)
 * Displaying Google reviews requires Google attribution + a link back, which
 * the widget renders.
 */
const EMPTY = { rating: null, count: 0, reviews: [] };

export async function onRequestGet({ env }) {
  const key = env.GOOGLE_PLACES_API_KEY;
  const placeId = env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return json(EMPTY);

  const cache = caches.default;
  const cacheKey = new Request(`https://reviews.internal/reviews/${placeId}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const url =
      'https://maps.googleapis.com/maps/api/place/details/json' +
      `?place_id=${encodeURIComponent(placeId)}` +
      '&fields=rating,user_ratings_total,reviews,url' +
      `&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.result) return json(EMPTY);

    const r = data.result;
    const reviews = (r.reviews || [])
      .filter((rv) => rv && rv.text && rv.author_name)
      .map((rv) => ({
        author: rv.author_name,
        rating: rv.rating ?? null,
        text: rv.text,
        when: rv.relative_time_description ?? '',
        url: rv.author_url ?? null,
        photo: rv.profile_photo_url ?? null,
      }));

    const body = {
      rating: typeof r.rating === 'number' ? r.rating : null,
      count: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : 0,
      profileUrl: r.url ?? null,
      reviews,
    };
    const resp = json(body, { 'Cache-Control': 'public, max-age=21600' });
    await cache.put(cacheKey, resp.clone());
    return resp;
  } catch {
    return json(EMPTY);
  }
}

function json(obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
