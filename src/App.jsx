import { useState, useEffect, useCallback, useRef } from 'react';
// Build Version: 2026.05.14.6 - Strict No-Duplicate Architecture
import { COLUMNS, AIS_MINING_COLUMNS, AIS_MINING_MODULES, MODULES } from './constants';

import { generateId } from './utils';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import DetailDrawer from './components/DetailDrawer';
import BulkMoveModal from './components/BulkMoveModal';
import NewOrderModal from './components/NewOrderModal';

import { supabase } from './supabaseClient';

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

// ─── Strict dedup: returns a new array with duplicates removed ──────────────
// Orders: dedup key is id+vin (because one order row is flattened per vehicle)
// All others: dedup key is id only
function dedupTickets(tickets, module) {
  const seen = new Map();
  for (const t of tickets) {
    const key = module === 'Orders'
      ? `${t.id}-${t.vin || t.tracking_id || ''}`
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

  // Tracks which module is actively being fetched — realtime ignores stale fetches
  const fetchingModule = useRef(null);
  // Tracks the current active module for realtime handler closures
  const activeModuleRef = useRef(activeModule);
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  // ─── Fetch one module ─────────────────────────────────────────────────────
  const fetchModule = useCallback(async (module) => {
    if (module === 'Orders') {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_vehicles(vin, registration_no, model, make, engine_no, fuel_type, emission_type, mfg_year, rto_office_code, rto_state, tracking_id)')
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

  // ─── Realtime: only subscribe to active module, always full-replace ────────
  useEffect(() => {
    let channel = null;
    let isCurrent = true; // guards against stale closures after cleanup

    const module = activeModule;
    const table  = MODULE_TABLE[module];

    channel = supabase
      .channel(`rt-${module}-${Date.now()}`) // unique channel name prevents ghost subscriptions
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (!isCurrent) return;
        if (activeModuleRef.current !== module) return;

        if (module === 'Orders') {
          // For Orders, always do a full DB re-fetch (flattened join rows can't be built from payload alone)
          fetchModule('Orders').then((rows) => {
            if (!isCurrent) return;
            // Full replace — no merging
            setTicketMap((prev) => ({ ...prev, Orders: rows }));
          });
          return;
        }

        setTicketMap((prev) => {
          const current = prev[module] || [];

          if (payload.eventType === 'INSERT') {
            const newTicket = normalizeTicket(payload.new, module);
            // Skip if already present (guard against duplicate realtime events)
            if (current.some((t) => String(t.id) === String(newTicket.id))) return prev;
            return { ...prev, [module]: [newTicket, ...current] };
          }

          if (payload.eventType === 'UPDATE') {
            const updated = normalizeTicket(payload.new, module);
            const exists  = current.some((t) => String(t.id) === String(updated.id));
            const next    = exists
              ? current.map((t) => (String(t.id) === String(updated.id) ? updated : t))
              : current; // don't add if not present — avoids phantom rows
            return { ...prev, [module]: next };
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

    return () => {
      isCurrent = false;
      supabase.removeChannel(channel);
    };
  }, [activeModule, fetchModule]); // re-subscribes on every module switch

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

  // ─── Fire outbound webhook to TML ─────────────────────────────────────────
  async function fireOutboundWebhook(ticket, rawStatus, extraFields = {}) {
    const apiBase   = import.meta.env.VITE_TML_API_URL || 'https://tml-oem-api.vercel.app';
    const STATUS_MAP = {
      in_progress: 'IN_PROGRESS', completed: 'COMPLETED',
      on_hold: 'ON_HOLD', cancelled: 'CANCELLED',
      cancelled_due_to_change_request: 'CANCELLED_DUE_TO_CHANGE_REQUEST',
    };
    const statusStr = STATUS_MAP[rawStatus];
    if (!statusStr) return;

    try {
      if (activeModule === 'AIS140') {
        await fetch(`${apiBase}/webhooks/v2/ais140-requests`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: ticket.vin, ticketNo: ticket.ticket_no, status: statusStr, remark: extraFields.remark || '', handler: extraFields.handler || '', handlerContact: extraFields.handler_contact || '', updatedAt: new Date().toISOString(), metadata: {} }),
        });
      }
      if (activeModule === 'Mining') {
        await fetch(`${apiBase}/webhooks/mining-requests`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: ticket.vin, ticketNo: ticket.mining_ticket_no || ticket.ticket_no, status: statusStr, remark: extraFields.remark || '', handler: extraFields.handler || '', handlerContact: extraFields.handler_contact || '', updatedAt: new Date().toISOString(), metadata: {} }),
        });
      }
      if (activeModule === 'Installation' && rawStatus === 'completed') {
        await fetch(`${apiBase}/webhooks/device-fitment`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'DEVICE_INSTALLED', updatedAt: new Date().toISOString(), meta: { technicianName: extraFields.technician_name || '', installationDate: extraFields.scheduled_date || '', remarks: extraFields.remark || 'Marked completed from Kanban' } }),
        });
      }
      if (activeModule === 'Shipment' && rawStatus === 'in_progress') {
        await fetch(`${apiBase}/webhooks/device-fitment`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_SHIPPED', updatedAt: new Date().toISOString(), meta: { iccId: extraFields.iccid || '', courier: extraFields.courier || '', courierTrackingNumber: extraFields.awb_number || '', expectedDelivery: extraFields.expected_delivery || '' } }),
        });
      }
      if (activeModule === 'Delivery' && rawStatus === 'completed') {
        await fetch(`${apiBase}/webhooks/device-fitment`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_DELIVERED', updatedAt: new Date().toISOString(), meta: { remarks: `Delivered to ${extraFields.delivered_to || ''}` } }),
        });
      }
    } catch (webhookErr) {
      console.warn('[outbound] Webhook fire failed (non-blocking):', webhookErr.message);
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
    const ticket = tickets.find((t) => t.id === moveTarget.id);
    if (!ticket) return;

    const rawStatus    = displayToRaw(targetCol);
    const allowedCols  = MODULE_DB_FIELDS[activeModule] || [];

    // dbFields: only keys that actually exist as columns in this module's table
    const dbFields     = Object.fromEntries(
      Object.entries(extraFields).filter(([k]) => allowedCols.includes(k))
    );
    // webhookFields: full extraFields passed to the webhook (not written to DB)
    const webhookFields = { ...extraFields };

    try {
      const { error: updateErr } = await supabase
        .from(ticket._table)
        .update({ status: rawStatus, ...dbFields })
        .eq('id', ticket.id);
      if (updateErr) throw updateErr;

      await writeHistory(ticket, ticket._rawStatus, rawStatus, { notes });
      fireOutboundWebhook(ticket, rawStatus, webhookFields);

      // Always full-replace after write
      const fresh = await fetchModule(activeModule);
      setTicketMap((prev) => ({ ...prev, [activeModule]: fresh }));

      setDetailOrder((prev) => {
        if (!prev || prev.id !== ticket.id) return prev;
        const updated = fresh.find((t) => t.id === ticket.id);
        return updated || { ...prev, status: targetCol, _rawStatus: rawStatus };
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

    try {
      await Promise.all(ids.map(async (id) => {
        const ticket = tickets.find((t) => t.id === id);
        if (!ticket) return;
        const { error: updateErr } = await supabase
          .from(ticket._table)
          .update({ status: rawStatus })
          .eq('id', id);
        if (updateErr) throw updateErr;
        await writeHistory(ticket, ticket._rawStatus, rawStatus);
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
