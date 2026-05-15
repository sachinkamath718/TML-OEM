import { useState, useEffect, useCallback, useRef } from 'react';
// Build Version: 2026.05.14.7 - Single-ticket move fix, updated_at, CVP API
import { COLUMNS, AIS_MINING_COLUMNS, AIS_MINING_MODULES, MODULES } from './constants';

import { generateId } from './utils';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import DetailDrawer from './components/DetailDrawer';
import BulkMoveModal from './components/BulkMoveModal';
import NewOrderModal from './components/NewOrderModal';

import { supabase } from './supabaseClient';
import {
  deviceFitmentWebhook,
  ais140RequestUpdate,
  miningRequestUpdate,
} from './cvpClient';

const MODULE_TABLE = {
  Orders:       'orders',
  Shipment:     'shipment_tickets',
  Delivery:     'delivery_tickets',
  Installation: 'installation_tickets',
  AIS140:       'ais140_tickets',
  Mining:       'mining_tickets',
};

const MODULE_STAGE = {
  Orders:       'order',
  Shipment:     'shipment',
  Delivery:     'delivery',
  Installation: 'installation',
  AIS140:       'ais140',
  Mining:       'mining',
};

function normalizeTicket(ticket, module) {
  const statusMap = {
    pending:                           'Pending',
    in_progress:                       'In Progress',
    completed:                         'Completed',
    on_hold:                           'On Hold',
    failed:                            'Failed',
    cancelled:                         'Cancelled',
    cancelled_due_to_change_request:   'Cancelled Due To Change Request',
    'Cancelled':                       'Cancelled',
    'Cancelled Due To Change Request': 'Cancelled Due To Change Request',
  };
  return {
    ...ticket,
    _module:    module,
    _table:     MODULE_TABLE[module],
    status:     statusMap[ticket.status] || ticket.status || 'Pending',
    _rawStatus: ticket.status,
  };
}

function displayToRaw(display) {
  const map = {
    'Pending':                           'pending',
    'In Progress':                       'in_progress',
    'Completed':                         'completed',
    'On Hold':                           'on_hold',
    'Failed':                            'failed',
    'Cancelled':                         'cancelled',
    'Cancelled Due To Change Request':   'cancelled_due_to_change_request',
  };
  return map[display] || display.toLowerCase().replace(/ /g, '_');
}

// ─── Strict dedup ────────────────────────────────────────────────────────────
// Orders: key = _vehicle_tracking_id (unique per vehicle row, never collides)
// All others: key = id (each ticket has its own row)
function dedupTickets(tickets, module) {
  const seen = new Map();
  for (const t of tickets) {
    const key = module === 'Orders'
      ? String(t._vehicle_tracking_id || t.tracking_id || `${t.id}-${t.vin || ''}`)
      : String(t.id);
    if (!seen.has(key)) seen.set(key, t);
  }
  return Array.from(seen.values());
}

export default function App() {
  // Single source of truth: Map<module, ticket[]> — always fully replaced, never merged/appended
  const [ticketMap, setTicketMap]       = useState({});
  const [activeModule, setActiveModule] = useState('Orders');
  const [loading, setLoading]           = useState(true);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [error, setError]               = useState(null);

  const [moveTarget, setMoveTarget]     = useState(null);
  const [detailOrder, setDetailOrder]   = useState(null);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkMode, setBulkMode]         = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch]             = useState('');

  // Tracks the current active module for realtime handler closures
  const activeModuleRef = useRef(activeModule);
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  // ─── Fetch one module ─────────────────────────────────────────────────────
  const fetchModule = useCallback(async (module) => {
    if (module === 'Orders') {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_vehicles(vin, registration_no, model, make, engine_no, fuel_type, emission_type, mfg_year, rto_office_code, rto_state, tracking_id, status, updated_at)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = [];
      for (const order of data || []) {
        const vehicles = order.order_vehicles || [];
        if (vehicles.length === 0) {
          rows.push(normalizeTicket({ ...order, order_vehicles: undefined }, module));
        } else {
          for (const v of vehicles) {
            rows.push(normalizeTicket({
              ...order,
              // Per-vehicle status from order_vehicles — NOT the parent order status
              status:          v.status || order.status,
              updated_at:      v.updated_at || order.updated_at,
              vin:             v.vin,
              registration_no: v.registration_no,
              model:           v.model,
              make:            v.make,
              engine_no:       v.engine_no,
              fuel_type:       v.fuel_type,
              emission_type:   v.emission_type,
              mfg_year:        v.mfg_year,
              rto_office_code: v.rto_office_code,
              rto_state:       v.rto_state,
              tracking_id:     v.tracking_id || order.tracking_id,
              // Keep the vehicle row's own identity for targeted updates
              _vehicle_tracking_id: v.tracking_id,
              order_vehicles:  undefined,
            }, module));
          }
        }
      }
      // Dedup before returning — DB join can produce dupes if called in rapid succession
      return dedupTickets(rows, 'Orders');
    }

    const table = MODULE_TABLE[module];
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return dedupTickets((data || []).map((t) => normalizeTicket(t, module)), module);
  }, []);

  // ─── Load a module and replace its slice entirely ─────────────────────────
  const loadModule = useCallback(async (module) => {
    const rows = await fetchModule(module);
    // Always REPLACE — never spread-merge — to prevent accumulation
    setTicketMap((prev) => ({ ...prev, [module]: rows }));
    return rows;
  }, [fetchModule]);

  // ─── Initial load: only load active module, nothing else ──────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        await loadModule(activeModule);
      } catch (err) {
        setError('Failed to load: ' + err.message);
      }
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line

  // ─── Realtime subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    let isCurrent = true;
    const channels = [];

    const module = activeModule;
    const table  = MODULE_TABLE[module];

    // For Orders we need to watch both tables:
    //   • 'orders'         — new orders inserted
    //   • 'order_vehicles' — per-vehicle status updates
    // We debounce the re-fetch so rapid-fire events don't cause double-replace.
    if (module === 'Orders') {
      let debounceTimer = null;
      const scheduleRefetch = () => {
        if (!isCurrent) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!isCurrent) return;
          fetchModule('Orders').then((rows) => {
            if (!isCurrent) return;
            setTicketMap((prev) => ({ ...prev, Orders: rows }));
          });
        }, 150); // 150 ms debounce — collapses burst events into one fetch
      };

      const ordersChannel = supabase
        .channel(`rt-orders-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefetch)
        .subscribe();

      const vehiclesChannel = supabase
        .channel(`rt-order_vehicles-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_vehicles' }, scheduleRefetch)
        .subscribe();

      channels.push(ordersChannel, vehiclesChannel);

      return () => {
        isCurrent = false;
        clearTimeout(debounceTimer);
        channels.forEach((ch) => supabase.removeChannel(ch));
      };
    }

    // All other modules: surgical in-place updates (no full re-fetch on UPDATE)
    const channel = supabase
      .channel(`rt-${module}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (!isCurrent) return;
        if (activeModuleRef.current !== module) return;

        setTicketMap((prev) => {
          const current = prev[module] || [];

          if (payload.eventType === 'INSERT') {
            const newTicket = normalizeTicket(payload.new, module);
            if (current.some((t) => String(t.id) === String(newTicket.id))) return prev;
            return { ...prev, [module]: [newTicket, ...current] };
          }

          if (payload.eventType === 'UPDATE') {
            const updated = normalizeTicket(payload.new, module);
            const exists  = current.some((t) => String(t.id) === String(updated.id));
            if (!exists) return prev; // don't add phantom rows
            return {
              ...prev,
              [module]: current.map((t) =>
                String(t.id) === String(updated.id) ? updated : t
              ),
            };
          }

          if (payload.eventType === 'DELETE') {
            return {
              ...prev,
              [module]: current.filter((t) => String(t.id) !== String(payload.old.id)),
            };
          }

          return prev;
        });

        if (payload.eventType === 'UPDATE') {
          setDetailOrder((prev) =>
            prev?.id === payload.new.id ? normalizeTicket(payload.new, module) : prev
          );
        }
      })
      .subscribe();

    channels.push(channel);

    return () => {
      isCurrent = false;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [activeModule, fetchModule]);

  // ─── Switch module: full fresh fetch, full replace ────────────────────────
  const handleModuleSwitch = useCallback(async (mod) => {
    if (mod === activeModule) return;

    setSelectedIds(new Set());
    setBulkMode(false);
    setSearch('');
    setActiveModule(mod);
    setSwitchLoading(true);

    try {
      await loadModule(mod);
    } catch (_) {}

    setSwitchLoading(false);
  }, [activeModule, loadModule]);

  // ─── Active tickets (always from the replaced slice) ──────────────────────
  const rawTickets     = ticketMap[activeModule] || [];
  // One final dedup pass as a safety net
  const tickets        = dedupTickets(rawTickets, activeModule);

  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.vin, t.ticket_no, t.tracking_id, t.order_number, t.mining_ticket_no]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(q));
  });

  // ─── Selection helpers ────────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAll(ids, select) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }
  function exitBulkMode() {
    setSelectedIds(new Set());
    setBulkMode(false);
  }

  // ─── Write history row ────────────────────────────────────────────────────
  async function writeHistory(ticket, fromRaw, toRaw, extra = {}) {
    const orderId = activeModule === 'Orders' ? ticket.id : ticket.order_id;
    if (!orderId) { console.warn('No order_id found for history write, skipping.'); return; }
    const { error } = await supabase.from('order_status_history').insert({
      order_id:    orderId,
      vin:         ticket.vin       || null,
      stage:       MODULE_STAGE[activeModule],
      from_status: fromRaw          || null,
      to_status:   toRaw,
      changed_by:  extra.changed_by || null,
      notes:       extra.notes      || null,
      metadata:    extra.metadata   || null,
    });
    if (error) console.warn('History write failed:', error.message);
  }

  // ─── Fire outbound webhook via CVP client ─────────────────────────────────
  // All calls are non-blocking (fire-and-forget with logged errors).
  async function fireOutboundWebhook(ticket, rawStatus, extraFields = {}) {
    const STATUS_MAP = {
      in_progress:                     'IN_PROGRESS',
      completed:                       'COMPLETED',
      on_hold:                         'ON_HOLD',
      cancelled:                       'CANCELLED',
      cancelled_due_to_change_request: 'CANCELLED_DUE_TO_CHANGE_REQUEST',
    };
    const statusStr  = STATUS_MAP[rawStatus];
    if (!statusStr) return;

    // Use the actual DB updated_at if present, else now — never use created_at
    const updatedAt = ticket.updated_at
      ? new Date(ticket.updated_at).toISOString()
      : new Date().toISOString();

    try {
      if (activeModule === 'AIS140') {
        const { error } = await ais140RequestUpdate({
          vin:             ticket.vin,
          ticketNo:        ticket.ticket_no,
          status:          statusStr,
          remark:          extraFields.remark          || '',
          handler:         extraFields.handler         || '',
          handlerContact:  extraFields.handler_contact || '',
          updatedAt,
          metadata: {},
        });
        if (error) console.warn('[cvp] AIS140 webhook error:', error);
        else console.log(`[cvp] AIS140 webhook sent: ${ticket.ticket_no} → ${statusStr}`);
      }

      if (activeModule === 'Mining') {
        const { error } = await miningRequestUpdate({
          vin:            ticket.vin,
          ticketNo:       ticket.mining_ticket_no || ticket.ticket_no,
          status:         statusStr,
          remark:         extraFields.remark          || '',
          handler:        extraFields.handler         || '',
          handlerContact: extraFields.handler_contact || '',
          updatedAt,
          metadata: {},
        });
        if (error) console.warn('[cvp] Mining webhook error:', error);
        else console.log(`[cvp] Mining webhook sent: ${ticket.mining_ticket_no} → ${statusStr}`);
      }

      if (activeModule === 'Installation' && rawStatus === 'completed') {
        const { error } = await deviceFitmentWebhook({
          trackingId: ticket.tracking_id,
          vin:        ticket.vin,
          stage:      'DEVICE_INSTALLED',
          updatedAt,
          metadata: {
            technicianName:   extraFields.technician_name || '',
            installationDate: extraFields.scheduled_date  || '',
            remarks:          extraFields.remark          || 'Marked completed from Kanban',
          },
        });
        if (error) console.warn('[cvp] DEVICE_INSTALLED webhook error:', error);
        else console.log(`[cvp] DEVICE_INSTALLED sent: ${ticket.tracking_id}`);
      }

      if (activeModule === 'Shipment' && rawStatus === 'in_progress') {
        const { error } = await deviceFitmentWebhook({
          trackingId: ticket.tracking_id,
          vin:        ticket.vin,
          stage:      'TCU_SHIPPED',
          updatedAt,
          metadata: {
            iccId:                 extraFields.icc_id        || extraFields.iccid || '',
            courier:               extraFields.courier       || '',
            courierTrackingNumber: extraFields.awb_number    || '',
            expectedDelivery:      extraFields.expected_delivery || '',
          },
        });
        if (error) console.warn('[cvp] TCU_SHIPPED webhook error:', error);
        else console.log(`[cvp] TCU_SHIPPED sent: ${ticket.tracking_id}`);
      }

      if (activeModule === 'Delivery' && rawStatus === 'completed') {
        const { error } = await deviceFitmentWebhook({
          trackingId: ticket.tracking_id,
          vin:        ticket.vin,
          stage:      'TCU_DELIVERED',
          updatedAt,
          metadata: {
            remarks: `Delivered to ${extraFields.delivered_to || ''}`,
          },
        });
        if (error) console.warn('[cvp] TCU_DELIVERED webhook error:', error);
        else console.log(`[cvp] TCU_DELIVERED sent: ${ticket.tracking_id}`);
      }
    } catch (webhookErr) {
      console.warn('[cvp] Webhook fire failed (non-blocking):', webhookErr.message);
    }
  }

  // ─── Per-module allowlist of actual DB columns (beyond `status`) ──────────
  // Only these keys from extraFields are written to the database.
  // Everything else is webhook-only and must NOT be sent to Supabase.
  const MODULE_DB_FIELDS = {
    Orders:       [],
    Shipment:     ['courier', 'awb_number', 'expected_delivery', 'icc_id'],
    Delivery:     ['delivered_to', 'delivered_at'],
    Installation: ['technician_name', 'scheduled_date', 'installation_date'],
    AIS140:       ['handler', 'handler_contact', 'remark'],
    Mining:       ['handler', 'handler_contact', 'remark'],
  };

  // ─── Single move ──────────────────────────────────────────────────────────
  async function handleMove(moveData) {
    const { targetCol, extraFields = {}, notes = '' } = moveData;

    // For Orders module, rows are flattened by vehicle — match on id+vin
    // For all other modules, each ticket has its own unique id
    const ticket = activeModule === 'Orders'
      ? tickets.find((t) => t.id === moveTarget.id && t.vin === moveTarget.vin)
      : tickets.find((t) => t.id === moveTarget.id);
    if (!ticket) return;

    const rawStatus   = displayToRaw(targetCol);
    const allowedCols = MODULE_DB_FIELDS[activeModule] || [];
    const now         = new Date().toISOString();

    // Only whitelisted columns go to Supabase; everything else is webhook-only
    const dbFields = Object.fromEntries(
      Object.entries(extraFields).filter(([k]) => allowedCols.includes(k))
    );
    const webhookFields = { ...extraFields };

    try {
      let updateErr;

      if (activeModule === 'Orders') {
        // Orders: update the specific vehicle row in order_vehicles by its tracking_id
        // This ensures only ONE vehicle row moves, not all vehicles in the same order
        const vehicleTrackingId = ticket._vehicle_tracking_id || ticket.tracking_id;
        ({ error: updateErr } = await supabase
          .from('order_vehicles')
          .update({ status: rawStatus, updated_at: now })
          .eq('tracking_id', vehicleTrackingId));
      } else {
        // All other modules: each ticket has a unique id — update exactly that row
        ({ error: updateErr } = await supabase
          .from(ticket._table)
          .update({ status: rawStatus, updated_at: now, ...dbFields })
          .eq('id', ticket.id));
      }
      if (updateErr) throw updateErr;

      // Attach the fresh updated_at so the webhook uses the DB-stamped time
      const ticketWithTime = { ...ticket, updated_at: now };

      await writeHistory(ticketWithTime, ticket._rawStatus, rawStatus, { notes });
      fireOutboundWebhook(ticketWithTime, rawStatus, webhookFields);

      // Full-replace after write — dedupTickets handles any residual dupes
      const fresh = await fetchModule(activeModule);
      setTicketMap((prev) => ({ ...prev, [activeModule]: fresh }));

      setDetailOrder((prev) => {
        if (!prev || prev.id !== ticket.id) return prev;
        const updated = fresh.find((t) =>
          activeModule === 'Orders'
            ? t.id === ticket.id && t.vin === ticket.vin
            : t.id === ticket.id
        );
        return updated || { ...prev, status: targetCol, _rawStatus: rawStatus, updated_at: now };
      });
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
    setMoveTarget(null);
  }

  // ─── Bulk move ────────────────────────────────────────────────────────────
  async function handleBulkMove({ targetCol }) {
    const ids       = [...selectedIds];
    const rawStatus = displayToRaw(targetCol);
    const now       = new Date().toISOString();

    try {
      await Promise.all(ids.map(async (id) => {
        const ticket = tickets.find((t) => t.id === id);
        if (!ticket) return;
        const { error: updateErr } = await supabase
          .from(ticket._table)
          .update({ status: rawStatus, updated_at: now })
          .eq('id', id);
        if (updateErr) throw updateErr;
        await writeHistory({ ...ticket, updated_at: now }, ticket._rawStatus, rawStatus);
      }));

      // Full-replace after all writes
      const fresh = await fetchModule(activeModule);
      setTicketMap((prev) => ({ ...prev, [activeModule]: fresh }));

      exitBulkMode();
      setShowBulkMove(false);
    } catch (err) {
      alert('Bulk update failed: ' + err.message);
    }
  }

  // ─── Create order ─────────────────────────────────────────────────────────
  async function handleCreate(orderPayload, vehicleRows) {
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({ ...orderPayload, tracking_id: 'TRK-' + generateId(), created_by: 'system' })
        .select()
        .single();
      if (orderErr) throw orderErr;

      for (const v of vehicleRows) {
        const trackingId = 'TRK-' + generateId();
        await supabase.from('order_vehicles').insert({ order_id: orderData.id, vin: v.vin, ticket_id: 'TKT-' + generateId(), tracking_id: trackingId, status: 'pending' });
        const base = { vin: v.vin, tracking_id: trackingId, order_id: orderData.id, status: 'pending' };
        await supabase.from('shipment_tickets').insert({ ...base, ticket_no: 'SHP-' + generateId() });
        await supabase.from('delivery_tickets').insert({ ...base, ticket_no: 'DLV-' + generateId() });
        await supabase.from('installation_tickets').insert({ ...base, ticket_no: 'INS-' + generateId() });
        await supabase.from('ais140_tickets').insert({ ...base, ticket_no: 'AIS-' + generateId() });
        await supabase.from('mining_tickets').insert({ ...base, mining_ticket_no: 'MIN-' + generateId() });
      }

      await supabase.from('order_status_history').insert({ order_id: orderData.id, vin: null, stage: 'order', from_status: null, to_status: 'pending', changed_by: null, notes: 'Order created' });
      setShowNewOrder(false);
    } catch (err) {
      alert('Failed to create order: ' + err.message);
    }
  }

  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#64748B', fontSize: 14 }}>
        Loading {activeModule}…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ background: '#fff', border: '1px solid #FCA5A5', borderRadius: 12, padding: '24px 32px', color: '#DC2626', fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Connection Error</div>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh', background: '#F8FAFC', display: 'flex' }}>
      <Sidebar
        activeModule={activeModule}
        onSelect={handleModuleSwitch}
        totalOrders={tickets.length}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: -0.3 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
              {tickets.length} total · {inProgressCount} in progress
              {switchLoading && (
                <span style={{ marginLeft: 8, color: '#CBD5E1' }}>loading…</span>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }} />

          {bulkMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '5px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>{selectedIds.size} selected</span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBulkMove(true)}
                  style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Move Selected →
                </button>
              )}
              <button
                onClick={exitBulkMode}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#fff', color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search VIN, ticket no…"
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, width: 220, outline: 'none', fontFamily: 'inherit', background: '#F8FAFC', color: '#0F172A' }}
          />
          <button
            onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${bulkMode ? '#2563EB' : '#E2E8F0'}`, background: bulkMode ? '#EFF6FF' : '#F8FAFC', color: bulkMode ? '#2563EB' : '#64748B' }}
          >
            ☑ Bulk
          </button>
          <button
            onClick={() => setShowNewOrder(true)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add Vehicles
          </button>
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 24px' }}>
          {(() => {
            const activeCols = AIS_MINING_MODULES.includes(activeModule) ? AIS_MINING_COLUMNS : COLUMNS;
            return (
              <div style={{ display: 'flex', gap: 14, minWidth: activeCols.length * 210 }}>
                {activeCols.map((col) => (
                  <KanbanColumn
                    key={col}
                    col={col}
                    orders={filteredTickets.filter((t) => t.status === col)}
                    onMoveClick={setMoveTarget}
                    onHistoryClick={setDetailOrder}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSelectAll={selectAll}
                    bulkMode={bulkMode}
                    module={activeModule}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {detailOrder && (
        <DetailDrawer
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onMoveClick={(o) => { setMoveTarget(o); setDetailOrder(null); }}
        />
      )}
      {moveTarget && (
        <MoveModal
          order={moveTarget}
          module={activeModule}
          onClose={() => setMoveTarget(null)}
          onMove={handleMove}
        />
      )}
      {showBulkMove && (
        <BulkMoveModal
          count={selectedIds.size}
          onClose={() => setShowBulkMove(false)}
          onConfirm={handleBulkMove}
        />
      )}
      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onCreated={() => setShowNewOrder(false)}
        />
      )}
    </div>
  );
}
