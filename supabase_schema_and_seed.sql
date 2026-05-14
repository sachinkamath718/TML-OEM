-- ============================================================
-- TML-OEM Supabase Schema + Seed
-- Run in: supabase.com/dashboard/project/dfewivwmtnmwuikkjdor/sql/new
-- ============================================================

-- 1. Orders
CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL PRIMARY KEY,
  order_number   TEXT NOT NULL UNIQUE,
  tml_order_id   TEXT,
  tracking_id    TEXT,
  status         TEXT DEFAULT 'pending',
  created_by     TEXT,
  customer_details JSONB,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Order Vehicles
CREATE TABLE IF NOT EXISTS order_vehicles (
  id               BIGSERIAL PRIMARY KEY,
  order_id         BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  vin              TEXT NOT NULL UNIQUE,
  ticket_id        TEXT UNIQUE,
  tracking_id      TEXT UNIQUE,
  registration_no  TEXT,
  engine_no        TEXT,
  model            TEXT,
  make             TEXT,
  variant          TEXT,
  mfg_year         TEXT,
  fuel_type        TEXT,
  emission_type    TEXT,
  rto_office_code  TEXT,
  rto_state        TEXT,
  iccid            TEXT,
  device_imei      TEXT,
  device_make      TEXT,
  device_model     TEXT,
  ais140_ticket_no TEXT UNIQUE,
  mining_ticket_no TEXT UNIQUE,
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shipment Tickets
CREATE TABLE IF NOT EXISTS shipment_tickets (
  id               BIGSERIAL PRIMARY KEY,
  ticket_no        TEXT NOT NULL UNIQUE,
  vin              TEXT NOT NULL,
  tracking_id      TEXT,
  order_id         BIGINT,
  status           TEXT DEFAULT 'pending',
  courier          TEXT,
  awb_number       TEXT,
  expected_delivery DATE,
  dispatched_at    TIMESTAMPTZ,
  metadata         JSONB,
  notes            TEXT,
  assigned_to      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Delivery Tickets
CREATE TABLE IF NOT EXISTS delivery_tickets (
  id               BIGSERIAL PRIMARY KEY,
  ticket_no        TEXT NOT NULL UNIQUE,
  vin              TEXT NOT NULL,
  tracking_id      TEXT,
  order_id         BIGINT,
  status           TEXT DEFAULT 'pending',
  delivered_to     TEXT,
  delivery_date    DATE,
  delivery_address TEXT,
  metadata         JSONB,
  notes            TEXT,
  assigned_to      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Installation Tickets
CREATE TABLE IF NOT EXISTS installation_tickets (
  id               BIGSERIAL PRIMARY KEY,
  ticket_no        TEXT NOT NULL UNIQUE,
  vin              TEXT NOT NULL,
  tracking_id      TEXT,
  order_id         BIGINT,
  status           TEXT DEFAULT 'pending',
  technician_name  TEXT,
  scheduled_date   DATE,
  device_imei      TEXT,
  device_status    TEXT,
  sim_expiry_date  DATE,
  metadata         JSONB,
  notes            TEXT,
  assigned_to      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AIS140 Tickets
CREATE TABLE IF NOT EXISTS ais140_tickets (
  id                                  BIGSERIAL PRIMARY KEY,
  ticket_no                           TEXT NOT NULL UNIQUE,
  vin                                 TEXT NOT NULL,
  tracking_id                         TEXT,
  order_tracking_id                   TEXT,
  status                              TEXT DEFAULT 'pending',
  vehicle_details                     JSONB,
  customer_details                    JSONB,
  handler                             TEXT,
  handler_contact                     TEXT,
  remark                              TEXT,
  process_datetime                    TIMESTAMPTZ,
  certification_registration_datetime TIMESTAMPTZ,
  certification_expiry_date           DATE,
  certificate_file_location           TEXT,
  certificate_file_name               TEXT,
  sim_expiry_date                     DATE,
  device_imei                         TEXT,
  metadata                            JSONB,
  notes                               TEXT,
  assigned_to                         TEXT,
  created_at                          TIMESTAMPTZ DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Mining Tickets
CREATE TABLE IF NOT EXISTS mining_tickets (
  id               BIGSERIAL PRIMARY KEY,
  mining_ticket_no TEXT NOT NULL UNIQUE,
  vin              TEXT NOT NULL,
  tracking_id      TEXT,
  order_tracking_id TEXT,
  status           TEXT DEFAULT 'pending',
  vehicle_details  JSONB,
  customer_details JSONB,
  handler          TEXT,
  handler_contact  TEXT,
  remark           TEXT,
  process_datetime TIMESTAMPTZ,
  polling_datetime TIMESTAMPTZ,
  sim_expiry_date  DATE,
  device_imei      TEXT,
  metadata         JSONB,
  notes            TEXT,
  assigned_to      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Status History (audit trail)
CREATE TABLE IF NOT EXISTS order_status_history (
  id          BIGSERIAL PRIMARY KEY,
  ticket_id   TEXT,
  module      TEXT,
  vin         TEXT,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  TEXT,
  notes       TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 9. API Response Logs (stores every webhook/FleetEdge API call result)
CREATE TABLE IF NOT EXISTS api_response_logs (
  id          BIGSERIAL PRIMARY KEY,
  vin         TEXT,
  tracking_id TEXT,
  module      TEXT,          -- Shipment | Delivery | Installation | AIS140 | Mining
  stage       TEXT,          -- e.g. SHIPMENT_DISPATCHED, DELIVERY_COMPLETED, etc.
  request     JSONB,         -- what we sent
  response    JSONB,         -- what we got back
  status_code INTEGER,       -- HTTP status code from the external call
  success     BOOLEAN,       -- true if 2xx
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLEANUP + RESEED
-- Clears ALL data and seeds exactly 3 test vehicles.
-- Run this entire block in Supabase SQL Editor.
-- ============================================================

-- ── Step 0: Delete all data (order matters for FK constraints) ────────────────
DELETE FROM order_status_history;
DELETE FROM mining_tickets;
DELETE FROM ais140_tickets;
DELETE FROM installation_tickets;
DELETE FROM delivery_tickets;
DELETE FROM shipment_tickets;
DELETE FROM order_vehicles;
DELETE FROM orders;

-- Reset sequences so IDs start cleanly from 1
ALTER SEQUENCE orders_id_seq                RESTART WITH 1;
ALTER SEQUENCE order_vehicles_id_seq        RESTART WITH 1;
ALTER SEQUENCE shipment_tickets_id_seq      RESTART WITH 1;
ALTER SEQUENCE delivery_tickets_id_seq      RESTART WITH 1;
ALTER SEQUENCE installation_tickets_id_seq  RESTART WITH 1;
ALTER SEQUENCE ais140_tickets_id_seq        RESTART WITH 1;
ALTER SEQUENCE mining_tickets_id_seq        RESTART WITH 1;
ALTER SEQUENCE order_status_history_id_seq  RESTART WITH 1;

-- ── Step 1: Ensure api_clients row exists (needed for client_ref_id FK) ───────
INSERT INTO api_clients (client_id, client_secret, client_name, status)
VALUES ('itriangle', 'webhook-auto', 'iTriangle FleetEdge', 1)
ON CONFLICT (client_id) DO NOTHING;

-- ── Step 2: Insert 1 order (all 3 vehicles belong to this order) ──────────────
INSERT INTO orders (order_number, tml_order_id, tracking_id, client_ref_id, status, created_by)
SELECT
  'WH-ITRIANGLE-001',
  'WH-ITRIANGLE-001',
  'TRK-1778594367038-6435A639',
  ac.id,
  'pending',
  'SYSTEM'
FROM api_clients ac
WHERE ac.client_id = 'itriangle'
LIMIT 1;

-- ── Step 3: Insert 3 order_vehicles ──────────────────────────────────────────
INSERT INTO order_vehicles (order_id, vin, tracking_id, ticket_id, status, ais140_ticket_no, mining_ticket_no, make, model)
SELECT
  o.id,
  v.vin,
  v.tracking_id,
  v.ticket_id,
  'pending',
  v.ais_no,
  v.min_no,
  'TATA',
  'MAT Series'
FROM orders o,
  (VALUES
    ('MAT800313N8H16571','TRK-1778594367038-6435A639','TKT-16571','AIS-16571','MIN-16571'),
    ('MAT800313N8H16572','TRK-1778595514787-5D91DE01','TKT-16572','AIS-16572','MIN-16572'),
    ('MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TKT-16573','AIS-16573','MIN-16573')
  ) AS v(vin, tracking_id, ticket_id, ais_no, min_no)
WHERE o.order_number = 'WH-ITRIANGLE-001';

-- ── Step 4: Shipment tickets ──────────────────────────────────────────────────
INSERT INTO shipment_tickets (ticket_no, vin, tracking_id, order_id, status)
SELECT 'SHP-' || v.short, v.vin, v.tid, o.id, 'pending'
FROM orders o,
  (VALUES
    ('16571','MAT800313N8H16571','TRK-1778594367038-6435A639'),
    ('16572','MAT800313N8H16572','TRK-1778595514787-5D91DE01'),
    ('16573','MAT800313N8H16573','TRK-1778596418166-90CD9AB7')
  ) AS v(short, vin, tid)
WHERE o.order_number = 'WH-ITRIANGLE-001';

-- ── Step 5: Delivery tickets ──────────────────────────────────────────────────
INSERT INTO delivery_tickets (ticket_no, vin, tracking_id, order_id, status)
SELECT 'DLV-' || v.short, v.vin, v.tid, o.id, 'pending'
FROM orders o,
  (VALUES
    ('16571','MAT800313N8H16571','TRK-1778594367038-6435A639'),
    ('16572','MAT800313N8H16572','TRK-1778595514787-5D91DE01'),
    ('16573','MAT800313N8H16573','TRK-1778596418166-90CD9AB7')
  ) AS v(short, vin, tid)
WHERE o.order_number = 'WH-ITRIANGLE-001';

-- ── Step 6: Installation tickets ─────────────────────────────────────────────
INSERT INTO installation_tickets (ticket_no, vin, tracking_id, order_id, status, sim_expiry_date)
SELECT 'INS-' || v.short, v.vin, v.tid, o.id, 'pending', v.sim::DATE
FROM orders o,
  (VALUES
    ('16571','MAT800313N8H16571','TRK-1778594367038-6435A639','2026-05-14'),
    ('16572','MAT800313N8H16572','TRK-1778595514787-5D91DE01','2027-03-31'),
    ('16573','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','2027-06-30')
  ) AS v(short, vin, tid, sim)
WHERE o.order_number = 'WH-ITRIANGLE-001';

-- ── Step 7: AIS140 tickets ────────────────────────────────────────────────────
INSERT INTO ais140_tickets (ticket_no, vin, tracking_id, order_tracking_id, status, sim_expiry_date)
VALUES
  ('AIS-16571','MAT800313N8H16571','TRK-1778594367038-6435A639','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('AIS-16572','MAT800313N8H16572','TRK-1778595514787-5D91DE01','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('AIS-16573','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TRK-1778596418166-90CD9AB7','pending','2027-06-30');

-- ── Step 8: Mining tickets ────────────────────────────────────────────────────
INSERT INTO mining_tickets (mining_ticket_no, vin, tracking_id, order_tracking_id, status, sim_expiry_date)
VALUES
  ('MIN-16571','MAT800313N8H16571','TRK-1778594367038-6435A639','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('MIN-16572','MAT800313N8H16572','TRK-1778595514787-5D91DE01','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('MIN-16573','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TRK-1778596418166-90CD9AB7','pending','2027-06-30');
