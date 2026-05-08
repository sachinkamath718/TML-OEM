import { useState, useEffect, useCallback } from 'react';
import { COLUMNS, MODULES } from './constants';
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
    pending:     'Pending',
    in_progress: 'In Progress',
    completed:   'Completed',
    on_hold:     'On Hold',
    failed:      'Failed',
  };
  return {
    ...ticket,
    _module:    module,
    _table:     MODULE_TABLE[module],
    status:     statusMap[ticket.status] || 'Pending',
    _rawStatus: ticket.status,
  };
}

function displayToRaw(display) {
  const map = {
    'Pending':     'pending',
    'In Progress': 'in_progress',
    'Completed':   'completed',
    'On Hold':     'on_hold',
    'Failed':      'failed',
  };
  return map[display] || 'pending';
}

export default function App() {
  const [allTickets, setAllTickets]     = useState({});
  const [loadedMods, setLoadedMods]     = useState({});
  const [activeModule, setActiveModule] = useState('Orders');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [moveTarget, setMoveTarget]     = useState(null);
  const [detailOrder, setDetailOrder]   = useState(null);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkMode, setBulkMode]         = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch]             = useState('');

  // ─── Fetch one module ─────────────────────────────────────────────────────
  const fetchModule = useCallback(async (module) => {
    // Orders: join order_vehicles to get VINs and vehicle details
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
      return rows;
    }

    // All other modules
    const table = MODULE_TABLE[module];
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t) => normalizeTicket(t, module));
  }, []);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const first = await fetchModule(activeModule);
        setAllTickets((prev) => ({ ...prev, [activeModule]: first }));
        setLoadedMods((prev) => ({ ...prev, [activeModule]: true }));
        setLoading(false);

        const rest = MODULES.filter((m) => m !== activeModule);
        for (const mod of rest) {
          try {
            const tickets = await fetchModule(mod);
            setAllTickets((prev) => ({ ...prev, [mod]: tickets }));
            setLoadedMods((prev) => ({ ...prev, [mod]: true }));
          } catch (_) {}
        }
      } catch (err) {
        setError('Failed to load: ' + err.message);
        setLoading(false);
      }
    }
    init();
  }, []); // eslint-disable-line

  // ─── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const channels = MODULES.map((module) => {
      const table = MODULE_TABLE[module];
      return supabase
        .channel(`${table}-rt`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          // For Orders module, re-fetch to get joined vehicle data
          if (module === 'Orders') {
            fetchModule('Orders').then((rows) => {
              setAllTickets((prev) => ({ ...prev, Orders: rows }));
            });
            return;
          }
          setAllTickets((prev) => {
            const current = prev[module] || [];
            if (payload.eventType === 'INSERT') {
              return { ...prev, [module]: [normalizeTicket(payload.new, module), ...current] };
            } else if (payload.eventType === 'UPDATE') {
              return { ...prev, [module]: current.map((t) => t.id === payload.new.id ? normalizeTicket(payload.new, module) : t) };
            } else if (payload.eventType === 'DELETE') {
              return { ...prev, [module]: current.filter((t) => t.id !== payload.old.id) };
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
    });
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [fetchModule]);

  // ─── Active tickets ───────────────────────────────────────────────────────
  const tickets = allTickets[activeModule] || [];

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
    // For Orders module the ticket IS the order, so use ticket.id as order_id
    const orderId = activeModule === 'Orders' ? ticket.id : ticket.order_id;

    if (!orderId) {
      console.warn('No order_id found for history write, skipping.');
      return;
    }

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

  // ─── Single move ──────────────────────────────────────────────────────────
  async function handleMove(moveData) {
    const { targetCol, extraFields = {}, notes = '' } = moveData;
    const ticket = tickets.find((t) => t.id === moveTarget.id);
    if (!ticket) return;

    const rawStatus = displayToRaw(targetCol);

    const safeExtra = { ...extraFields };
    delete safeExtra.changed_by;
    delete safeExtra.notes;

    try {
      const updatePayload = { status: rawStatus, ...safeExtra };

      const { error: updateErr } = await supabase
        .from(ticket._table)
        .update(updatePayload)
        .eq('id', ticket.id);
      if (updateErr) throw updateErr;

      await writeHistory(ticket, ticket._rawStatus, rawStatus, { notes });

      // For Orders, re-fetch to keep VIN join in sync
      if (activeModule === 'Orders') {
        const fresh = await fetchModule('Orders');
        setAllTickets((prev) => ({ ...prev, Orders: fresh }));
        setDetailOrder((prev) => {
          if (!prev || prev.id !== ticket.id) return prev;
          const updated = fresh.find((t) => t.id === ticket.id);
          return updated || { ...prev, status: targetCol, _rawStatus: rawStatus };
        });
      } else {
        setAllTickets((prev) => ({
          ...prev,
          [activeModule]: (prev[activeModule] || []).map((t) =>
            t.id === ticket.id
              ? { ...t, status: targetCol, _rawStatus: rawStatus, ...safeExtra }
              : t
          ),
        }));
        setDetailOrder((prev) =>
          prev?.id === ticket.id
            ? { ...prev, status: targetCol, _rawStatus: rawStatus, ...safeExtra }
            : prev
        );
      }
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

      if (activeModule === 'Orders') {
        const fresh = await fetchModule('Orders');
        setAllTickets((prev) => ({ ...prev, Orders: fresh }));
      } else {
        setAllTickets((prev) => ({
          ...prev,
          [activeModule]: (prev[activeModule] || []).map((t) =>
            selectedIds.has(t.id) ? { ...t, status: targetCol, _rawStatus: rawStatus } : t
          ),
        }));
      }
      exitBulkMode();
      setShowBulkMove(false);
    } catch (err) {
      alert('Bulk update failed: ' + err.message);
    }
  }

  // ─── Create order (simple VIN-only flow) ─────────────────────────────────
  async function handleCreate(orderPayload, vehicleRows, spocRow) {
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({ ...orderPayload, tracking_id: 'TRK-' + generateId() })
        .select()
        .single();
      if (orderErr) throw orderErr;

      for (const v of vehicleRows) {
        const trackingId = 'TRK-' + generateId();

        await supabase.from('order_vehicles').insert({
          order_id:    orderData.id,
          vin:         v.vin,
          ticket_id:   'TKT-' + generateId(),
          tracking_id: trackingId,
          status:      'pending',
        });

        const base = { vin: v.vin, tracking_id: trackingId, order_id: orderData.id, status: 'pending' };
        await supabase.from('shipment_tickets').insert({ ...base, ticket_no: 'SHP-' + generateId() });
        await supabase.from('delivery_tickets').insert({ ...base, ticket_no: 'DLV-' + generateId() });
        await supabase.from('installation_tickets').insert({ ...base, ticket_no: 'INS-' + generateId() });
        await supabase.from('ais140_tickets').insert({ ...base, ticket_no: 'AIS-' + generateId() });
        await supabase.from('mining_tickets').insert({ ...base, mining_ticket_no: 'MIN-' + generateId() });
      }

      await supabase.from('order_status_history').insert({
        order_id:    orderData.id,
        vin:         null,
        stage:       'order',
        from_status: null,
        to_status:   'pending',
        changed_by:  null,
        notes:       'Order created',
      });

      for (const mod of MODULES) {
        const fresh = await fetchModule(mod);
        setAllTickets((prev) => ({ ...prev, [mod]: fresh }));
      }
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
        onSelect={(m) => { setActiveModule(m); exitBulkMode(); setSearch(''); }}
        totalOrders={tickets.length}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: -0.3 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
              {tickets.length} total · {inProgressCount} in progress
              {!loadedMods[activeModule] && (
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
          <div style={{ display: 'flex', gap: 14, minWidth: 900 }}>
            {COLUMNS.map((col) => (
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
              />
            ))}
          </div>
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
          onCreated={async () => {
            for (const mod of MODULES) {
              const fresh = await fetchModule(mod);
              setAllTickets((prev) => ({ ...prev, [mod]: fresh }));
            }
          }}
        />
      )}
    </div>
  );
}
