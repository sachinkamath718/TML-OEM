import { useState, useEffect } from 'react';
import { COLUMNS, MODULES } from './constants';
import { generateId } from './utils';
import { createOrder } from './api';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import DetailDrawer from './components/DetailDrawer';
import BulkMoveModal from './components/BulkMoveModal';
import NewOrderModal from './components/NewOrderModal';

import { supabase } from './supabaseClient';

// Maps module name → Supabase table name
const MODULE_TABLE = {
  Orders:       'orders',
  Shipment:     'shipment_tickets',
  Delivery:     'delivery_tickets',
  Installation: 'installation_tickets',
  AIS140:       'ais140_tickets',
  Mining:       'mining_tickets',
};

// Maps each table's status field value → display status
function normalizeTicket(ticket, module) {
  const statusMap = {
    pending:     'Pending',
    in_progress: 'In Process',
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
    'Pending':    'pending',
    'In Process': 'in_progress',
    'Completed':  'completed',
    'On Hold':    'on_hold',
    'Failed':     'failed',
  };
  return map[display] || 'pending';
}

export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [moveTarget, setMoveTarget]     = useState(null);
  const [detailOrder, setDetailOrder]   = useState(null);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkMode, setBulkMode]         = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch]             = useState('');

  // ─── Fetch active module's tickets ────────────────────────────────────────
  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError(null);
      try {
        const table = MODULE_TABLE[activeModule];
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setTickets((data || []).map((t) => normalizeTicket(t, activeModule)));
      } catch (err) {
        setError('Failed to load tickets: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [activeModule]);

  // ─── Realtime for active module ────────────────────────────────────────────
  useEffect(() => {
    const table = MODULE_TABLE[activeModule];
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets((prev) => [normalizeTicket(payload.new, activeModule), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTickets((prev) => prev.map((t) =>
            t.id === payload.new.id ? normalizeTicket(payload.new, activeModule) : t
          ));
          setDetailOrder((prev) =>
            prev?.id === payload.new.id ? normalizeTicket(payload.new, activeModule) : prev
          );
        } else if (payload.eventType === 'DELETE') {
          setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeModule]);

  // ─── Filtered tickets ──────────────────────────────────────────────────────
  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.vin, t.ticket_no, t.tracking_id, t.order_number, t.mining_ticket_no]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(q));
  });

  // ─── Selection helpers ─────────────────────────────────────────────────────
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

  // ─── Single move ───────────────────────────────────────────────────────────
  async function handleMove({ targetCol, user, note }) {
    const ticket = tickets.find((t) => t.id === moveTarget.id);
    if (!ticket) return;

    const rawStatus = displayToRaw(targetCol);
    const historyEntry = {
      id: 'h-' + generateId(),
      action: 'Status Changed',
      from: ticket.status,
      to: targetCol,
      timestamp: new Date().toISOString(),
      user, note,
    };
    const updatedHistory = [...(ticket.history || []), historyEntry];

    try {
      const { error } = await supabase
        .from(ticket._table)
        .update({ status: rawStatus, metadata: { ...ticket.metadata, last_updated_by: user }, history: updatedHistory })
        .eq('id', ticket.id);
      if (error) throw error;

      setTickets((prev) => prev.map((t) =>
        t.id === ticket.id ? { ...t, status: targetCol, _rawStatus: rawStatus, history: updatedHistory } : t
      ));
      setDetailOrder((prev) =>
        prev?.id === ticket.id ? { ...prev, status: targetCol, history: updatedHistory } : prev
      );
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
    setMoveTarget(null);
  }

  // ─── Bulk move ─────────────────────────────────────────────────────────────
  async function handleBulkMove({ targetCol, user, note }) {
    const ids = [...selectedIds];
    const rawStatus = displayToRaw(targetCol);
    const now = new Date().toISOString();

    try {
      await Promise.all(ids.map((id) => {
        const ticket = tickets.find((t) => t.id === id);
        if (!ticket) return Promise.resolve();
        const updatedHistory = [...(ticket.history || []), {
          id: 'h-' + generateId(), action: 'Status Changed',
          from: ticket.status, to: targetCol,
          timestamp: now, user, note,
        }];
        return supabase
          .from(ticket._table)
          .update({ status: rawStatus, history: updatedHistory })
          .eq('id', id);
      }));

      setTickets((prev) => prev.map((t) => {
        if (!selectedIds.has(t.id)) return t;
        return { ...t, status: targetCol, _rawStatus: rawStatus };
      }));
      exitBulkMode();
      setShowBulkMove(false);
    } catch (err) {
      alert('Bulk update failed: ' + err.message);
    }
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(tmlPayload, orderPayload, vehicleRows, spocRow) {
    try {
      // Step 1: Call TML API
      const { data: tmlData, error: tmlError } = await createOrder(tmlPayload);
      if (tmlError) { alert('TML API error: ' + tmlError); return; }

      // Step 2: Insert into orders table
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({ ...orderPayload, tml_order_id: tmlData?.[0]?.order_tracking_id || null, tracking_id: tmlData?.[0]?.order_tracking_id || ('TRK-' + generateId()) })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // Step 3: Insert order_vehicles with TML tracking IDs merged
      const enrichedVehicles = vehicleRows.map((v) => {
        const tmlVehicle = tmlData?.find((t) => t.vin === v.vin);
        return {
          ...v,
          order_id:         orderData.id,
          ticket_id:        tmlVehicle?.order_tracking_id || ('TKT-' + generateId()),
          tracking_id:      tmlVehicle?.order_tracking_id || ('TRK-' + generateId()),
          ais140_ticket_no: tmlVehicle?.ais140_ticket_no  || null,
          mining_ticket_no: tmlVehicle?.mining_ticket_no  || null,
        };
      });

      const { error: vehicleErr } = await supabase.from('order_vehicles').insert(enrichedVehicles);
      if (vehicleErr) throw vehicleErr;

      // Step 4: Insert SPOC details for each vehicle's tracking_id
      const spocRows = enrichedVehicles.map((v) => ({
        ...spocRow,
        tracking_id: v.tracking_id,
      }));
      await supabase.from('spoc_details').insert(spocRows);

      // Step 5: Create tickets in each module table for each vehicle
      for (const v of enrichedVehicles) {
        const baseTicket = {
          vin:        v.vin,
          tracking_id: v.tracking_id,
          order_id:   orderData.id,
          status:     'pending',
        };

        await supabase.from('shipment_tickets').insert({ ...baseTicket, ticket_no: 'SHP-' + generateId() });
        await supabase.from('delivery_tickets').insert({ ...baseTicket, ticket_no: 'DLV-' + generateId() });
        await supabase.from('installation_tickets').insert({ ...baseTicket, ticket_no: 'INS-' + generateId() });

        if (v.ais140_ticket_no) {
          await supabase.from('ais140_tickets').insert({
            ...baseTicket,
            ticket_no:         v.ais140_ticket_no,
            order_tracking_id: v.tracking_id,
            vehicle_details:   { vin: v.vin, model: v.model, make: v.make },
            customer_details:  orderPayload.customer_details,
          });
        }

        if (v.mining_ticket_no) {
          await supabase.from('mining_tickets').insert({
            ...baseTicket,
            mining_ticket_no:  v.mining_ticket_no,
            order_tracking_id: v.tracking_id,
            vehicle_details:   { vin: v.vin, model: v.model, make: v.make },
            customer_details:  orderPayload.customer_details,
          });
        }
      }

      setShowNewOrder(false);
      // Refresh current module
      const table = MODULE_TABLE[activeModule];
      const { data: fresh } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      setTickets((fresh || []).map((t) => normalizeTicket(t, activeModule)));

    } catch (err) {
      alert('Failed to create order: ' + err.message);
    }
  }

  const moduleTickets   = tickets;
  const inProcessCount  = moduleTickets.filter((t) => t.status === 'In Process').length;

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
        totalOrders={moduleTickets.length}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: -0.3 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
              {moduleTickets.length} total · {inProcessCount} in progress
            </div>
          </div>
          <div style={{ flex: 1 }} />

          {bulkMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '5px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>{selectedIds.size} selected</span>
              {selectedIds.size > 0 && (
                <button onClick={() => setShowBulkMove(true)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Move Selected →
                </button>
              )}
              <button onClick={exitBulkMode} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#fff', color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>
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
            + New Order
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
        <MoveModal order={moveTarget} onClose={() => setMoveTarget(null)} onMove={handleMove} />
      )}
      {showBulkMove && (
        <BulkMoveModal count={selectedIds.size} onClose={() => setShowBulkMove(false)} onConfirm={handleBulkMove} />
      )}
      {showNewOrder && (
        <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
