// cvpClient.js — CVP API client with auto-refreshing token
const CVP_BASE   = '/cvp-api';
const CVP_ID     = 'itriangle';
const CVP_SECRET = '6p0ifiTHAQTLIKRLwofKbryAcWfU3Htw';

let _token          = null;
let _tokenExpiresAt = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiresAt - 60_000) return _token;

  const body = new URLSearchParams({
    client_id:     CVP_ID,
    client_secret: CVP_SECRET,
    grant_type:    'client_credentials',
  });

  const res  = await fetch(`${CVP_BASE}/auth/realms/cvp/protocol/openid-connect/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = await res.json();
  const tok  = json.access_token;
  if (!tok) throw new Error('CVP token failed: ' + JSON.stringify(json));

  _token          = tok;
  _tokenExpiresAt = Date.now() + (json.expires_in ? json.expires_in * 1000 : 24 * 60 * 60 * 1000);
  return _token;
}

async function apiFetch(path, options = {}, retry = true) {
  const token = await getToken();
  const res   = await fetch(`${CVP_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Authorization:  `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    _token = null;
    return apiFetch(path, options, false);
  }

  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

// ─── Device Fitment Webhook ───────────────────────────────────────────────────
// stage: 'TCU_SHIPPED' | 'TCU_DELIVERED' | 'DEVICE_INSTALLED'
export async function deviceFitmentWebhook(payload) {
  try {
    const { ok, json } = await apiFetch('/webhooks/device-fitment', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── AIS140 Request Update ────────────────────────────────────────────────────
export async function ais140RequestUpdate(payload) {
  try {
    const { ok, json } = await apiFetch('/webhooks/v2/ais140-requests', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── Mining Request Update ────────────────────────────────────────────────────
export async function miningRequestUpdate(payload) {
  try {
    const { ok, json } = await apiFetch('/webhooks/mining-requests', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── Get Device Status ────────────────────────────────────────────────────────
export async function getDeviceStatus(vin) {
  try {
    const { ok, json } = await apiFetch(
      `/device-status?vehicle-id=${encodeURIComponent(vin)}`
    );
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}
