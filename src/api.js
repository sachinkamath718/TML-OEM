const BASE_URL = '/tml-api';
const CLIENT_ID = 'tml-client-id';
const CLIENT_SECRET = 'tml-client-secret';

let _token = null;
let _tokenExpiresAt = 0;

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
  _tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
  return _token;
}

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
    _token = null;
    return apiFetch(path, options, false);
  }

  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export async function generateToken() {
  try {
    _token = null;
    const tok = await getToken();
    return { data: tok, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function createOrder(payload) {
  try {
    const { ok, json } = await apiFetch('/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function getOrderStatus(trackingId) {
  try {
    const { ok, json } = await apiFetch(
      `/order/status?trackingId=${encodeURIComponent(trackingId)}`
    );
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function updateSpoc(payload) {
  try {
    const { ok, json } = await apiFetch('/order/fitment/spoc', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function createAIS140Request(vehicles) {
  try {
    const { ok, json } = await apiFetch('/ais140', {
      method: 'POST',
      body: JSON.stringify(vehicles),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function createMiningRequest(vehicles) {
  try {
    const { ok, json } = await apiFetch('/mining', {
      method: 'POST',
      body: JSON.stringify(vehicles),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function getAIS140TicketStatus(tickets) {
  try {
    const { ok, json } = await apiFetch('/ais140/ticket-status', {
      method: 'POST',
      body: JSON.stringify({ err: null, data: tickets }),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function getMiningTicketStatus(tickets) {
  try {
    const { ok, json } = await apiFetch('/mining/ticket-status', {
      method: 'POST',
      body: JSON.stringify({ err: null, data: tickets }),
    });
    if (!ok) return { data: null, error: JSON.stringify(json) };
    return { data: json.data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}
