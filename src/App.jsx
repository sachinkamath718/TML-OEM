import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// Build Version: 2026.05.15.5 - Absolute VIN-Based Uniqueness
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

/**
 * STRATEGY: One Vehicle = One Card. Period.
 * Uniqueness is strictly VIN-based across ALL modules.
 * If VIN is missing, fall back to Tracking ID, then DB ID.
 */
function dedupTickets(tickets, module) {
  if (!tickets || tickets.length === 0) return [];
  const seen = new Map();
  for (const t of tickets) {
    const vin = String(t.vin || '').trim().toUpperCase();
    const trk = String(t.tracking_id || '').trim().toUpperCase();
    const id  = String(t.id || '');
    
    // Key priority: VIN > Tracking ID > DB ID
    let key = vin || trk || id;
    
    // For Orders tab, if multiple vehicles are in one order, we must allow them.
    // They WILL have different VINs, so the VIN key already works.
    
    if (!seen.has(key)) {
      seen.set(key, t);
    } else {
      const existing = seen.get(key);
      // Tie-breaker: keep whichever is "further" in the lifecycle or newer
      const existingStatus = existing.status || 'Pending';
      const newStatus = t.status || 'Pending';
      const existingDate = new Date(existing.updated_at || existing.created_at || 0).getTime();
      const newDate = new Date(t.updated_at || t.created_at || 0).getTime();
      
      if (newStatus === 'Completed' && existingStatus !== 'Completed') {
        seen.set(key, t);
      } else if (newDate > existingDate) {
        seen.set(key, t);
      }
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

  // Derived state: deduplicated tickets for the active module
  const tickets = useMemo(() => {
    const raw = ticketMap[activeModule] || [];
    return dedupTickets(raw, activeModule);
  }, [ticketMap, activeModule]);

  // Global debug dump
  useEffect(() => {
    window.DUMP_STATE = () => {
      const dump = { activeModule, tickets, fullState: ticketMap };
      console.log('--- TML STATE DUMP ---', dump);
      return dump;
    };
  }, [activeModule, ticketMap, tickets]);

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
          tracking_id:     v.tracking_id || order.tracking_id,
          vin:             v.vin,
          status:          v.status || order.status,
          updated_at:      v.updated_at || order.updated_at,
        }, module);
      });
      return rows;
    }

    const table = MODULE_TABLE[module];
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t) => normalizeTicket(t, module));
  }, []);

  const loadModule = useCallback(async (module) => {
    const rows = await fetchModule(module);
    setTicketMap((prev) => ({ ...prev, [module]: rows }));
  }, [fetchModule]);

  useEffect(() => {
    loadModule(activeModule).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    let isCurrent = true;
    const channels = [];
    const module = activeModule;
    const table  = MODULE_TABLE[module];

    if (module === 'Orders') {
      let debounceTimer = null;
      const scheduleRefetch = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!isCurrent) return;
          fetchModule('Orders').then((rows) => {
            if (isCurrent) setTicketMap((prev) => ({ ...prev, Orders: rows }));
          });
        }, 300);
      };
      const vehiclesChannel = supabase.channel(`rt-order_vehicles-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'order_vehicles' }, scheduleRefetch).subscribe();
      channels.push(vehiclesChannel);
    } else {
      const channel = supabase.channel(`rt-${module}-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (!isCurrent || activeModuleRef.current !== module) return;
        setTicketMap((prev) => {
          const current = prev[module] || [];
          let nextList = [...current];
          if (payload.eventType === 'INSERT') nextList = [normalizeTicket(payload.new, module), ...current];
          else if (payload.eventType === 'UPDATE') {
            const updated = normalizeTicket(payload.new, module);
            nextList = current.map((t) => String(t.id) === String(updated.id) ? updated : t);
          } else if (payload.eventType === 'DELETE') {
            nextList = current.filter((t) => String(t.id) !== String(payload.old.id));
          }
          return { ...prev, [module]: nextList };
        });
      }).subscribe();
      channels.push(channel);
    }
    return () => { isCurrent = false; channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [activeModule, fetchModule]);

  const handleModuleSwitch = useCallback((mod) => {
    if (mod === activeModule) return;
    setSelectedIds(new Set());
    setBulkMode(false);
    setSearch('');
    setActiveModule(mod);
    setSwitchLoading(true);
    loadModule(mod).finally(() => setSwitchLoading(false));
  }, [activeModule, loadModule]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [t.vin, t.ticket_no, t.tracking_id, t.order_number].filter(Boolean).some((f) => f.toLowerCase().includes(q));
    });
  }, [tickets, search]);

  async function handleMove(moveData) {
    const { targetCol, extraFields = {}, notes = '' } = moveData;
    const ticket = tickets.find((t) => activeModule === 'Orders' ? (t.id === moveTarget.id && t.vin === moveTarget.vin) : (t.id === moveTarget.id));
    if (!ticket) return;
    const rawStatus = displayToRaw(targetCol);
    try {
      if (activeModule === 'Orders') await supabase.from('order_vehicles').update({ status: rawStatus, updated_at: new Date().toISOString() }).eq('tracking_id', ticket.tracking_id);
      else await supabase.from(ticket._table).update({ status: rawStatus, updated_at: new Date().toISOString(), ...extraFields }).eq('id', ticket.id);
      await supabase.from('order_status_history').insert({ order_id: (activeModule === 'Orders' ? ticket.id : ticket.order_id), vin: ticket.vin || null, stage: MODULE_STAGE[activeModule], from_status: ticket._rawStatus || null, to_status: rawStatus, notes: notes || null });
      fireOutboundWebhook(ticket, rawStatus, extraFields);
      await loadModule(activeModule);
    } catch (err) { alert('Failed: ' + err.message); }
    setMoveTarget(null);
  }

  async function fireOutboundWebhook(ticket, rawStatus, extraFields = {}) {
    const STATUS_MAP = { in_progress: 'IN_PROGRESS', completed: 'COMPLETED', on_hold: 'ON_HOLD', cancelled: 'CANCELLED', cancelled_due_to_change_request: 'CANCELLED_DUE_TO_CHANGE_REQUEST' };
    const statusStr = STATUS_MAP[rawStatus]; if (!statusStr) return;
    try {
      if (activeModule === 'AIS140') await ais140RequestUpdate({ vin: ticket.vin, ticketNo: ticket.ticket_no, status: statusStr, remark: extraFields.remark || '', updatedAt: new Date().toISOString() });
      if (activeModule === 'Mining') await miningRequestUpdate({ vin: ticket.vin, ticketNo: ticket.mining_ticket_no || ticket.ticket_no, status: statusStr, remark: extraFields.remark || '', updatedAt: new Date().toISOString() });
      if (activeModule === 'Installation' && rawStatus === 'completed') await deviceFitmentWebhook({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'DEVICE_INSTALLED', updatedAt: new Date().toISOString(), metadata: { technicianName: extraFields.technician_name || '', remarks: extraFields.remark || '' } });
      if (activeModule === 'Shipment' && rawStatus === 'in_progress') await deviceFitmentWebhook({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_SHIPPED', updatedAt: new Date().toISOString(), metadata: { courier: extraFields.courier || '', courierTrackingNumber: extraFields.awb_number || '' } });
      if (activeModule === 'Delivery' && rawStatus === 'completed') await deviceFitmentWebhook({ trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_DELIVERED', updatedAt: new Date().toISOString(), metadata: { remarks: `Delivered to ${extraFields.delivered_to || ''}` } });
    } catch (e) { console.warn('Webhook failed', e); }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#F8FAFC', display: 'flex' }}>
      <Sidebar activeModule={activeModule} onSelect={handleModuleSwitch} totalOrders={tickets.length} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{tickets.length} total {switchLoading && 'loading…'}</div>
          </div>
          <div style={{ flex: 1 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }} />
          <button onClick={() => setBulkMode(!bulkMode)} style={{ padding: '8px 14px' }}>☑ Bulk</button>
          <button onClick={() => setShowNewOrder(true)} style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8 }}>+ Add</button>
        </div>
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {(AIS_MINING_MODULES.includes(activeModule) ? AIS_MINING_COLUMNS : COLUMNS).map((col) => (
              <KanbanColumn
                key={col}
                col={col}
                orders={filteredTickets.filter((t) => t.status === col)}
                onMoveClick={setMoveTarget}
                onHistoryClick={setDetailOrder}
                selectedIds={selectedIds}
                onToggleSelect={(id) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
                onSelectAll={(ids, select) => setSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => select ? next.add(id) : next.delete(id)); return next; })}
                bulkMode={bulkMode}
                module={activeModule}
              />
            ))}
          </div>
        </div>
      </div>
      {detailOrder && <DetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} onMoveClick={(o) => { setMoveTarget(o); setDetailOrder(null); }} />}
      {moveTarget && <MoveModal order={moveTarget} module={activeModule} onClose={() => setMoveTarget(null)} onMove={handleMove} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreated={() => setShowNewOrder(false)} />}
    </div>
  );
}
