/**
 * TML OEM API — Service Layer
 * Base URL: https://tml-oem-api.vercel.app
 *
 * All functions return { data, error }.
 * Token is stored in memory (auto-refreshed on 401).
 */

const BASE_URL = 'https://tml-oem-api.vercel.app';
const CLIENT_ID = 'tml-client-id';
const CLIENT_SECRET = 'tml-client-secret';

// ─── Token cache ──────────────────────────────────────────────────────────────
let _token = null;
let _tokenExpiresAt = 0; // epoch ms

async function getToken() {
  if (_token && Date.now() < _tokenExpiresAt - 60_000) return _token;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = await res.json();
  const tok = json.access_token || json?.data?.access_token;
  if (!tok) throw new Error('Token fetch failed: ' + JSON.stringify(json));

  _token = tok;
  // Token valid for 12 h per spec
  _tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
  return _token;
}

// ─── Base fetch with auto-auth ────────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    _token = null; // force refresh
    return apiFetch(path, options, false);
  }

  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

// ─── 1. Generate Token (exposed for manual refresh UI) ────────────────────────
export async function generateToken() {
  try {
    _token = null;
    const tok = await getToken();
    return { data: tok, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 2. Order Creation ────────────────────────────────────────────────────────
/**
 * payload shape:
 * {
 *   order_id: string,
 *   customer_details: { name, pan, gst, email, contact_number },
 *   location_mappings: [
 *     {
 *       location: { id, address, city, pincode, district, state },
 *       spoc: { name, contact_number, email },
 *       vehicle_details: [
 *         {
 *           vin, registration_no, engine_no, model, make, variant,
 *           mfg_year, fuel_type, emission_type, rto_office_code, rto_state,
 *           products: [{ name, duration_in_years, metadata }]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Response data: [{ vin, order_tracking_id, ais140_ticket_no, mining_ticket_no }]
 */
export async function createOrder(payload) {
  try {
    const { ok, json } = await apiFetch('/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: json?.message || 'Order creation failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 3. Order Status ──────────────────────────────────────────────────────────
/**
 * trackingId: any vehicle's order_tracking_id from the order
 * Returns status for ALL vehicles in that order.
 * Note: updated_at is Unix epoch milliseconds (IST).
 */
export async function getOrderStatus(trackingId) {
  try {
    const { ok, json } = await apiFetch(
      `/order/status?trackingId=${encodeURIComponent(trackingId)}`
    );
    if (!ok) return { data: null, error: json?.message || 'Status fetch failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 4. SPOC Update ───────────────────────────────────────────────────────────
/**
 * payload: { tracking_id, name, contact_no, email }
 */
export async function updateSpoc(payload) {
  try {
    const { ok, json } = await apiFetch('/order/fitment/spoc', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: json?.message || 'SPOC update failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 5. AIS140 Cert Request ───────────────────────────────────────────────────
/**
 * vehicles: array of:
 * {
 *   vehicle_details: {
 *     vin, iccid, device_imei, device_make, device_model, engine_no,
 *     rto_office_code, rto_state, sim_expiry_date,
 *     certificate_validity_duration_in_year
 *   },
 *   customer_details: { name, city, state, mobile_no }
 * }
 *
 * Response data: [{ vin, ticket_no, status, validation_errors? }]
 * Calling again for same VIN creates a NEW ticket (renewal).
 */
export async function createAIS140Request(vehicles) {
  try {
    const { ok, json } = await apiFetch('/ais140', {
      method: 'POST',
      body: JSON.stringify(vehicles),
    });
    if (!ok) return { data: null, error: json?.message || 'AIS140 request failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 6. Mining Cert Request ───────────────────────────────────────────────────
/**
 * vehicles: array of:
 * {
 *   vehicle_details: {
 *     vin, iccid, device_imei, device_make, device_model, engine_no,
 *     department, sim_expiry_date, duration_in_year
 *   },
 *   customer_details: { name, city, state, mobile_no }
 * }
 *
 * Response data: [{ vin, mining_ticket_no, status, validation_errors? }]
 */
export async function createMiningRequest(vehicles) {
  try {
    const { ok, json } = await apiFetch('/mining', {
      method: 'POST',
      body: JSON.stringify(vehicles),
    });
    if (!ok) return { data: null, error: json?.message || 'Mining request failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 7. AIS140 Ticket Status ──────────────────────────────────────────────────
/**
 * tickets: [{ vin_no, ticket_no }]
 *   ticket_no: null  → returns ALL tickets for that VIN (newest first)
 *   ticket_no: "AIS-TKT-XXXXXXXXXX" → returns that specific ticket
 */
export async function getAIS140TicketStatus(tickets) {
  try {
    const { ok, json } = await apiFetch('/ais140/ticket-status', {
      method: 'POST',
      body: JSON.stringify({ err: null, data: tickets }),
    });
    if (!ok) return { data: null, error: json?.message || 'AIS140 status fetch failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── 8. Mining Ticket Status ──────────────────────────────────────────────────
/**
 * tickets: [{ vin_no, ticket_no }]
 *   ticket_no: null  → returns ALL tickets for that VIN (newest first)
 *   ticket_no: "MIN-TKT-XXXXXXXXXX" → returns that specific ticket
 */
export async function getMiningTicketStatus(tickets) {
  try {
    const { ok, json } = await apiFetch('/mining/ticket-status', {
      method: 'POST',
      body: JSON.stringify({ err: null, data: tickets }),
    });
    if (!ok) return { data: null, error: json?.message || 'Mining status fetch failed' };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}
