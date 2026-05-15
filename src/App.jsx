import { useState, useEffect, useCallback, useRef } from 'react';
// Build Version: 2026.05.15.3 - Final State Name Sync
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

function dedupTickets(tickets, module) {
  if (!tickets || tickets.length === 0) return [];
  const seen = new Map();
  for (const t of tickets) {
    let key;
    if (module === 'Orders') {
      key = `${t.id}-${t.vin || t.tracking_id || ''}`;
    } else {
      key = t.vin || t.tracking_id || String(t.id);
    }
    if (!seen.has(key)) {
      seen.set(key, t);
    } else {
      const existing = seen.get(key);
      const existingDate = new Date(existing.updated_at || 0);
      const newDate = new Date(t.updated_at || 0);
      if (newDate > existingDate) seen.set(key, t);
    }
  }
  return Array.from(seen.values());
}

export default function App() {
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

  const activeModuleRef = useRef(activeModule);
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  const fetchModule = useCallback(async (module) => {
    if (module === 'Orders') {
      const { data: vehicles, error: vErr } = await supabase
        .from('order_vehicles')
        .select('*, orders(id, order_number, created_at, created_by, tracking_id, status)')
        .order('created_at', { ascending: false });
      if (vErr) throw vErr;

      const rows = (vehicles || []).map((v) => {
        const order = v.orders || {};
        return normalizeTicket({
          id:              order.id,
          order_number:    order.order_number,
          created_at:      v.created_at || order.created_at,
          created_by:      order.created_by,
          _vehicle_tracking_id: v.tracking_id,
          tracking_id:     v.tracking_id || order.tracking_id,
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
          status:          v.status || order.status,
          updated_at:      v.updated_at || order.updated_at,
        }, module);
      });
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

  const loadModule = useCallback(async (module) => {
    const rows = await fetchModule(module);
    setTicketMap((prev) => ({ ...prev, [module]: rows }));
    return rows;
  }, [fetchModule]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try { await loadModule(activeModule); } 
      catch (err) { setError('Failed to load: ' + err.message); }
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line

  useEffect(() => {
    let isCurrent = true;
    const channels = [];
    const module = activeModule;
    const table  = MODULE_TABLE[module];

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
        }, 250);
      };
      const vehiclesChannel = supabase
        .channel(`rt-order_vehicles-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_vehicles' }, scheduleRefetch)
        .subscribe();
      channels.push(vehiclesChannel);
    } else {
      const channel = supabase
        .channel(`rt-${module}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          if (!isCurrent) return;
          if (activeModuleRef.current !== module) return;

          setTicketMap((prev) => {
            const current = prev[module] || [];
            if (payload.eventType === 'INSERT') {
              const newTicket = normalizeTicket(payload.new, module);
              const key = newTicket.vin || newTicket.tracking_id || String(newTicket.id);
              if (current.some((t) => (t.vin || t.tracking_id || String(t.id)) === key)) return prev;
              return { ...prev, [module]: [newTicket, ...current] };
            }
            if (payload.eventType === 'UPDATE') {
              const updated = normalizeTicket(payload.new, module);
              return {
                ...prev,
                [module]: current.map((t) => String(t.id) === String(updated.id) ? updated : t),
              };
            }
            if (payload.eventType === 'DELETE') {
              return { ...prev, [module]: current.filter((t) => String(t.id) !== String(payload.old.id)) };
            }
            return prev;
          });
        })
        .subscribe();
      channels.push(channel);
    }

    return () => {
      isCurrent = false;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [activeModule, fetchModule]);

  const handleModuleSwitch = useCallback(async (mod) => {
    if (mod === activeModule) return;
    setSelectedIds(new Set());
    setBulkMode(false);
    setSearch('');
    setActiveModule(mod);
    setSwitchLoading(true);
    try { await loadModule(mod); } catch (_) {}
    setSwitchLoading(false);
  }, [activeModule, loadModule]);

  const rawTickets = ticketMap[activeModule] || [];
  const tickets    = dedupTickets(rawTickets, activeModule);

  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.vin, t.ticket_no, t.tracking_id, t.order_number, t.mining_ticket_no]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(q));
  });

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
  function exitBulkMode() { setSelectedIds(new Set()); setBulkMode(false); }

  async function writeHistory(ticket, fromRaw, toRaw, extra = {}) {
    const orderId = activeModule === 'Orders' ? ticket.id : ticket.order_id;
    if (!orderId) return;
    await supabase.from('order_status_history').insert({
      order_id: orderId, vin: ticket.vin || null, stage: MODULE_STAGE[activeModule],
      from_status: fromRaw || null, to_status:   toRaw, changed_by: extra.changed_by || null, notes: extra.notes || null,
    });
  }

  async function fireOutboundWebhook(ticket, rawStatus, extraFields = {}) {
    const STATUS_MAP = {
      in_progress: 'IN_PROGRESS', completed: 'COMPLETED',
      on_hold: 'ON_HOLD', cancelled: 'CANCELLED',
      cancelled_due_to_change_request: 'CANCELLED_DUE_TO_CHANGE_REQUEST',
    };
    const statusStr = STATUS_MAP[rawStatus];
    if (!statusStr) return;
    try {
      if (activeModule === 'AIS140') { await ais140RequestUpdate({ vin: ticket.vin, ticketNo: ticket.ticket_no, status: statusStr, remark: extraFields.remark || '', handler: extraFields.handler || '', handlerContact: extraFields.handler_contact || '', updatedAt: new Date().toISOString() }); }
      if (activeModule === 'Mining') { await miningRequestUpdate({ vin: ticket.vin, ticketNo: ticket.mining_ticket_no || ticket.ticket_no, status: statusStr, remark: extraFields.remark || '', handler: extraFields.handler || '', handlerContact: extraFields.handler_contact || '', updatedAt: new Date().toISOString() }); }
      if (activeModule === 'Installation' && rawStatus === 'completed') { await deviceFitmentWebhook({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'DEVICE_INSTALLED', updatedAt: new Date().toISOString(), metadata: { technicianName: extraFields.technician_name || '', installationDate: extraFields.scheduled_date || '', remarks: extraFields.remark || '' } }); }
      if (activeModule === 'Shipment' && rawStatus === 'in_progress') { await deviceFitmentWebhook({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_SHIPPED', updatedAt: new Date().toISOString(), metadata: { courier: extraFields.courier || '', courierTrackingNumber: extraFields.awb_number || '' } }); }
      if (activeModule === 'Delivery' && rawStatus === 'completed') { await deviceFitmentWebhook({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_DELIVERED', updatedAt: new Date().toISOString(), metadata: { remarks: `Delivered to ${extraFields.delivered_to || ''}` } }); }
    } catch (e) { console.warn('Webhook failed', e); }
  }

  async function handleMove(moveData) {
    const { targetCol, extraFields = {}, notes = '' } = moveData;
    const ticket = tickets.find((t) => activeModule === 'Orders' ? (t.id === moveTarget.id && t.vin === moveTarget.vin) : (t.id === moveTarget.id));
    if (!ticket) return;
    const rawStatus = displayToRaw(targetCol);
    try {
      if (activeModule === 'Orders') { await supabase.from('order_vehicles').update({ status: rawStatus, updated_at: new Date().toISOString() }).eq('tracking_id', ticket.tracking_id); } 
      else { await supabase.from(ticket._table).update({ status: rawStatus, updated_at: new Date().toISOString(), ...extraFields }).eq('id', ticket.id); }
      await writeHistory(ticket, ticket._rawStatus, rawStatus, { notes });
      fireOutboundWebhook(ticket, rawStatus, extraFields);
      await loadModule(activeModule);
    } catch (err) { alert('Failed: ' + err.message); }
    setMoveTarget(null);
  }

  async function handleBulkMove({ targetCol }) {
    const rawStatus = displayToRaw(targetCol);
    try {
      await Promise.all([...selectedIds].map(async (id) => {
        const ticket = tickets.find((t) => t.id === id);
        if (!ticket) return;
        await supabase.from(ticket._table).update({ status: rawStatus, updated_at: new Date().toISOString() }).eq('id', id);
        await writeHistory(ticket, ticket._rawStatus, rawStatus);
      }));
      await loadModule(activeModule);
      exitBulkMode();
      setShowBulkMove(false);
    } catch (err) { alert('Bulk failed: ' + err.message); }
  }

  async function handleCreate(orderPayload, vehicleRows) {
    try {
      const { data: orderData, error: orderErr } = await supabase.from('orders').insert({ ...orderPayload, tracking_id: 'TRK-' + generateId(), created_by: 'system' }).select().single();
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
      setShowNewOrder(false);
    } catch (err) { alert('Failed: ' + err.message); }
  }

  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>Loading {activeModule}…</div>;
  if (error) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Error: {error}</div>;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#F8FAFC', display: 'flex' }}>
      <Sidebar activeModule={activeModule} onSelect={handleModuleSwitch} totalOrders={tickets.length} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{tickets.length} total · {inProgressCount} in progress {switchLoading && 'loading…'}</div>
          </div>
          <div style={{ flex: 1 }} />
          {bulkMode && <div style={{ display: 'flex', gap: 8, background: '#EFF6FF', padding: '5px 12px', borderRadius: 10 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{selectedIds.size} selected</span>{selectedIds.size > 0 && <button onClick={() => setShowBulkMove(true)} style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 7 }}>Move →</button>}<button onClick={exitBulkMode}>Cancel</button></div>}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }} />
          <button onClick={() => setBulkMode(!bulkMode)} style={{ padding: '8px 14px' }}>☑ Bulk</button>
          <button onClick={() => setShowNewOrder(true)} style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8 }}>+ Add</button>
        </div>
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 24px' }}>
          {(() => {
            const cols = AIS_MINING_MODULES.includes(activeModule) ? AIS_MINING_COLUMNS : COLUMNS;
            return <div style={{ display: 'flex', gap: 14 }}>{cols.map((col) => <KanbanColumn key={col} col={col} orders={filteredTickets.filter((t) => t.status === col)} onMoveClick={setMoveTarget} onHistoryClick={setDetailOrder} selectedIds={selectedIds} onToggleSelect={toggleSelect} onSelectAll={selectAll} bulkMode={bulkMode} module={activeModule} />)}</div>;
          })()}
        </div>
      </div>
      {detailOrder && <DetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} onMoveClick={(o) => { setMoveTarget(o); setDetailOrder(null); }} />}
      {moveTarget && <MoveModal order={moveTarget} module={activeModule} onClose={() => setMoveTarget(null)} onMove={handleMove} />}
      {showBulkMove && <BulkMoveModal count={selectedIds.size} onClose={() => setShowBulkMove(false)} onConfirm={handleBulkMove} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreated={() => setShowNewOrder(false)} />}
    </div>
  );
}
