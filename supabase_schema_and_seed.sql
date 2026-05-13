-- ============================================================
-- TML-OEM Supabase Schema + Test Data
-- Run this in: supabase.com/dashboard/project/dfewivwmtnmwuikkjdor/sql/new
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

-- ============================================================
-- SEED: 3 iTriangle Test Vehicles
-- ============================================================

-- Step 0: Ensure api_clients row exists for itriangle
INSERT INTO api_clients (client_id, client_secret, client_name, status)
VALUES ('itriangle', 'webhook-auto', 'iTriangle FleetEdge', 1)
ON CONFLICT (client_id) DO NOTHING;

-- Step 1: Insert the order (uses client_ref_id from api_clients)
INSERT INTO orders (order_number, tml_order_id, tracking_id, client_ref_id, status, created_by)
SELECT
  'WH-ITRIANGLE-TEST-001',
  'WH-ITRIANGLE-TEST-001',
  'TRK-1778594367038-6435A639',
  id,
  'pending',
  'itriangle-webhook'
FROM api_clients WHERE client_id = 'itriangle' LIMIT 1
ON CONFLICT (order_number) DO NOTHING;

-- Step 2: Insert order vehicles
INSERT INTO order_vehicles (order_id, vin, tracking_id, ticket_id, status, ais140_ticket_no, mining_ticket_no, make, model)
SELECT
  o.id,
  v.vin, v.tracking_id, v.ticket_id, 'pending', v.ais_no, v.min_no,
  'TATA', 'MAT Series'
FROM orders o,
  (VALUES
    ('MAT800313N8H16571','TRK-1778594367038-6435A639','TKT-TRK-1778594367038-6435A639','AIS-TRK-1778594367038-6435A639','MIN-TRK-1778594367038-6435A639'),
    ('MAT800313N8H16572','TRK-1778595514787-5D91DE01', 'TKT-TRK-1778595514787-5D91DE01', 'AIS-TRK-1778595514787-5D91DE01', 'MIN-TRK-1778595514787-5D91DE01'),
    ('MAT800313N8H16573','TRK-1778596418166-90CD9AB7', 'TKT-TRK-1778596418166-90CD9AB7', 'AIS-TRK-1778596418166-90CD9AB7', 'MIN-TRK-1778596418166-90CD9AB7')
  ) AS v(vin, tracking_id, ticket_id, ais_no, min_no)
WHERE o.order_number = 'WH-ITRIANGLE-TEST-001'
ON CONFLICT (vin) DO NOTHING;

-- Step 3: Shipment tickets
INSERT INTO shipment_tickets (ticket_no, vin, tracking_id, status)
VALUES
  ('TKT-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','pending'),
  ('TKT-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','pending'),
  ('TKT-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','pending')
ON CONFLICT (ticket_no) DO NOTHING;

-- Step 4: Delivery tickets
INSERT INTO delivery_tickets (ticket_no, vin, tracking_id, status)
VALUES
  ('TKT-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','pending'),
  ('TKT-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','pending'),
  ('TKT-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','pending')
ON CONFLICT (ticket_no) DO NOTHING;

-- Step 5: Installation tickets
INSERT INTO installation_tickets (ticket_no, vin, tracking_id, status, sim_expiry_date)
VALUES
  ('INS-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('INS-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('INS-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','pending','2027-06-30')
ON CONFLICT (ticket_no) DO NOTHING;

-- Step 6: AIS140 tickets (VIN-1 sim expires tomorrow — tests SE button alert)
INSERT INTO ais140_tickets (ticket_no, vin, tracking_id, order_tracking_id, status, sim_expiry_date)
VALUES
  ('AIS-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('AIS-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('AIS-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TRK-1778596418166-90CD9AB7','pending','2027-06-30')
ON CONFLICT (ticket_no) DO NOTHING;

-- Step 7: Mining tickets
INSERT INTO mining_tickets (mining_ticket_no, vin, tracking_id, order_tracking_id, status, sim_expiry_date)
VALUES
  ('MIN-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('MIN-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('MIN-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TRK-1778596418166-90CD9AB7','pending','2027-06-30')
ON CONFLICT (mining_ticket_no) DO NOTHING;


-- Insert order vehicles
INSERT INTO order_vehicles (order_id, vin, tracking_id, ticket_id, status, ais140_ticket_no, mining_ticket_no, make, model)
SELECT
  o.id,
  v.vin, v.tracking_id, v.ticket_id, 'pending', v.ais_no, v.min_no,
  'TATA', 'MAT Series'
FROM orders o,
  (VALUES
    ('MAT800313N8H16571','TRK-1778594367038-6435A639','TKT-TRK-1778594367038-6435A639','AIS-TRK-1778594367038-6435A639','MIN-TRK-1778594367038-6435A639'),
    ('MAT800313N8H16572','TRK-1778595514787-5D91DE01', 'TKT-TRK-1778595514787-5D91DE01', 'AIS-TRK-1778595514787-5D91DE01', 'MIN-TRK-1778595514787-5D91DE01'),
    ('MAT800313N8H16573','TRK-1778596418166-90CD9AB7', 'TKT-TRK-1778596418166-90CD9AB7', 'AIS-TRK-1778596418166-90CD9AB7', 'MIN-TRK-1778596418166-90CD9AB7')
  ) AS v(vin, tracking_id, ticket_id, ais_no, min_no)
WHERE o.order_number = 'WH-ITRIANGLE-TEST-001'
ON CONFLICT (vin) DO NOTHING;

-- Shipment tickets
INSERT INTO shipment_tickets (ticket_no, vin, tracking_id, status)
VALUES
  ('TKT-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','pending'),
  ('TKT-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','pending'),
  ('TKT-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','pending')
ON CONFLICT (ticket_no) DO NOTHING;

-- Delivery tickets
INSERT INTO delivery_tickets (ticket_no, vin, tracking_id, status)
VALUES
  ('TKT-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','pending'),
  ('TKT-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','pending'),
  ('TKT-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','pending')
ON CONFLICT (ticket_no) DO NOTHING;

-- Installation tickets
INSERT INTO installation_tickets (ticket_no, vin, tracking_id, status, sim_expiry_date)
VALUES
  ('INS-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('INS-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('INS-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','pending','2027-06-30')
ON CONFLICT (ticket_no) DO NOTHING;

-- AIS140 tickets (VIN-1 has an expiring SIM for testing SE button)
INSERT INTO ais140_tickets (ticket_no, vin, tracking_id, order_tracking_id, status, sim_expiry_date)
VALUES
  ('AIS-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('AIS-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('AIS-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TRK-1778596418166-90CD9AB7','pending','2027-06-30')
ON CONFLICT (ticket_no) DO NOTHING;

-- Mining tickets
INSERT INTO mining_tickets (mining_ticket_no, vin, tracking_id, order_tracking_id, status, sim_expiry_date)
VALUES
  ('MIN-TRK-1778594367038-6435A639','MAT800313N8H16571','TRK-1778594367038-6435A639','TRK-1778594367038-6435A639','pending','2026-05-14'),
  ('MIN-TRK-1778595514787-5D91DE01','MAT800313N8H16572','TRK-1778595514787-5D91DE01','TRK-1778595514787-5D91DE01','pending','2027-03-31'),
  ('MIN-TRK-1778596418166-90CD9AB7','MAT800313N8H16573','TRK-1778596418166-90CD9AB7','TRK-1778596418166-90CD9AB7','pending','2027-06-30')
ON CONFLICT (mining_ticket_no) DO NOTHING;
