import { useState, useEffect, useCallback, useRef } from 'react';
// Build Version: 2026.05.15.13 - Sync & Error Fix
import { COLUMNS, AIS_MINING_COLUMNS, AIS_MINING_MODULES, MODULES } from './constants';
import { generateId } from './utils';
import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import DetailDrawer from './components/DetailDrawer';
import BulkMoveModal from './components/BulkMoveModal';
import NewOrderModal from './components/NewOrderModal';
import WebhookLogPanel from './components/WebhookLogPanel';
import { supabase } from './supabaseClient';
import { deviceFitmentWebhook, ais140RequestUpdate, miningRequestUpdate } from './cvpClient';

const MODULE_TABLE = { Orders: 'order_vehicles', Shipment: 'shipment_tickets', Delivery: 'delivery_tickets', Installation: 'installation_tickets', AIS140: 'ais140_tickets', Mining: 'mining_tickets' };
const MODULE_STAGE = { Orders: 'order', Shipment: 'shipment', Delivery: 'delivery', Installation: 'installation', AIS140: 'ais140', Mining: 'mining' };

function normalizeTicket(t, mod) {
  const map = { pending:'Pending', in_progress:'In Progress', completed:'Completed', on_hold:'On Hold', failed:'Failed', cancelled:'Cancelled', cancelled_due_to_change_request:'Cancelled Due To Change Request' };
  return { ...t, _module:mod, _table:MODULE_TABLE[mod], status: map[t.status] || t.status || 'Pending', _rawStatus: t.status };
}

function displayToRaw(display) {
  const map = { 'Pending':'pending', 'In Progress':'in_progress', 'Completed':'completed', 'On Hold':'on_hold', 'Failed':'failed', 'Cancelled':'cancelled', 'Cancelled Due To Change Request':'cancelled_due_to_change_request' };
  return map[display] || display.toLowerCase().replace(/ /g, '_');
}

function dedup(list) {
  const seen = new Map();
  for (const t of list) {
    const key = String(t.vin || t.tracking_id || t.id).trim().toUpperCase();
    if (!seen.has(key)) seen.set(key, t);
    else {
      const old = seen.get(key);
      const oldD = new Date(old.updated_at || old.created_at || 0).getTime();
      const newD = new Date(t.updated_at || t.created_at || 0).getTime();
      if (newD > oldD) seen.set(key, t);
    }
  }
  return Array.from(seen.values());
}

export default function App() {
  const [ticketMap, setTicketMap] = useState({});
  const [activeModule, setActiveModule] = useState('Orders');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moveTarget, setMoveTarget] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showWebhookLog, setShowWebhookLog] = useState(false);

  const activeModuleRef = useRef(activeModule);
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  const fetchModule = useCallback(async (mod) => {
    if (mod === 'Orders') {
      const { data } = await supabase.from('order_vehicles').select('*, orders(*)').order('created_at', { ascending: false });
      return (data || []).map(v => normalizeTicket({ ...v, ...v.orders, id: v.id, vin: v.vin, tracking_id: v.tracking_id, status: v.status || v.orders.status }, mod));
    }
    const { data } = await supabase.from(MODULE_TABLE[mod]).select('*').order('created_at', { ascending: false });
    return (data || []).map(t => normalizeTicket(t, mod));
  }, []);

  const load = useCallback(async (mod) => {
    const rows = await fetchModule(mod);
    setTicketMap(p => ({ ...p, [mod]: rows }));
  }, [fetchModule]);

  useEffect(() => { load(activeModule).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    let isCurrent = true;
    const table = MODULE_TABLE[activeModule];
    const channel = supabase.channel(`rt-${activeModule}-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: activeModule === 'Orders' ? 'order_vehicles' : table }, () => {
      if (!isCurrent) return;
      fetchModule(activeModule).then(rows => { if (isCurrent) setTicketMap(p => ({ ...p, [activeModule]: rows })); });
    }).subscribe();
    return () => { isCurrent = false; supabase.removeChannel(channel); };
  }, [activeModule, fetchModule]);

  async function writeHistory(ticket, fromRaw, toRaw, extra = {}) {
    const ticketId = ticket.ticket_no || ticket.mining_ticket_no || String(ticket.id);
    const { error } = await supabase.from('order_status_history').insert({
      ticket_id: ticketId,
      module: activeModule,
      vin: ticket.vin || null,
      from_status: fromRaw || null,
      to_status: toRaw,
      notes: extra.notes || null,
      metadata: extra.metadata || null
    });
    if (error) console.error('History Error:', error);
  }

  async function logWebhook({ vin, tracking_id, module, stage, request, response, status_code, success }) {
    await supabase.from('api_response_logs').insert({
      vin, tracking_id, module, stage,
      request, response,
      status_code: status_code || null,
      success: !!success,
    }).then(({ error }) => { if (error) console.warn('Log write failed:', error.message); });
  }

  async function fireOutboundWebhook(ticket, rawStatus, extraFields = {}) {
    const STATUS_MAP = { in_progress: 'IN_PROGRESS', completed: 'COMPLETED', on_hold: 'ON_HOLD', cancelled: 'CANCELLED', cancelled_due_to_change_request: 'CANCELLED_DUE_TO_CHANGE_REQUEST' };
    const statusStr = STATUS_MAP[rawStatus]; if (!statusStr) return;
    try {
      const common = { 
        vin: ticket.vin, 
        ticketNo: ticket.ticket_no || ticket.mining_ticket_no, 
        status: statusStr, 
        remark: extraFields.remark || '', 
        updatedAt: Date.now(),
        certificateNumber: extraFields.certificate_number || null,
        certificateFileName: extraFields.certificate_file_name || null
      };
      if (activeModule === 'AIS140') {
        const { data, error } = await ais140RequestUpdate(common);
        await logWebhook({ vin: ticket.vin, tracking_id: ticket.tracking_id, module: 'AIS140', stage: statusStr, request: common, response: data || error, status_code: error ? 500 : 200, success: !error });
      }
      if (activeModule === 'Mining') {
        const { data, error } = await miningRequestUpdate(common);
        await logWebhook({ vin: ticket.vin, tracking_id: ticket.tracking_id, module: 'Mining', stage: statusStr, request: common, response: data || error, status_code: error ? 500 : 200, success: !error });
      }
      if (activeModule === 'Installation' && rawStatus === 'completed') {
        const payload = { trackingId: ticket.tracking_id || '', vin: ticket.vin || '', stage: 'DEVICE_INSTALLED', updatedAt: Date.now(), updated_at: Date.now(), metadata: { imei: extraFields.device_imei || ticket.device_imei || '', technicianName: extraFields.technician_name || ticket.technician_name || '', remarks: extraFields.remark || '' } };
        const { data, error } = await deviceFitmentWebhook(payload);
        await logWebhook({ vin: ticket.vin, tracking_id: ticket.tracking_id, module: 'Installation', stage: 'DEVICE_INSTALLED', request: payload, response: data || error, status_code: error ? 500 : 200, success: !error });
      }
      if (activeModule === 'Shipment' && rawStatus === 'in_progress') {
        const payload = { trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_SHIPPED', updatedAt: Date.now(), updated_at: Date.now(), metadata: { courier: extraFields.courier || '', courierTrackingNumber: extraFields.awb_number || '' } };
        const { data, error } = await deviceFitmentWebhook(payload);
        await logWebhook({ vin: ticket.vin, tracking_id: ticket.tracking_id, module: 'Shipment', stage: 'TCU_SHIPPED', request: payload, response: data || error, status_code: error ? 500 : 200, success: !error });
      }
      if (activeModule === 'Delivery' && rawStatus === 'completed') {
        const payload = { trackingId: ticket.tracking_id, vin: ticket.vin, stage: 'TCU_DELIVERED', updatedAt: Date.now(), updated_at: Date.now(), metadata: { remarks: `Delivered to ${extraFields.delivered_to || ''}` } };
        const { data, error } = await deviceFitmentWebhook(payload);
        await logWebhook({ vin: ticket.vin, tracking_id: ticket.tracking_id, module: 'Delivery', stage: 'TCU_DELIVERED', request: payload, response: data || error, status_code: error ? 500 : 200, success: !error });
      }
    } catch (e) { console.warn('Webhook failed', e); }
  }

  const allTicketsForMod = ticketMap[activeModule] || [];
  const uniqueTickets    = dedup(allTicketsForMod);
  const filtered         = uniqueTickets.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (t.vin||'').toLowerCase().includes(q) || (t.ticket_no||'').toLowerCase().includes(q) || (t.tracking_id||'').toLowerCase().includes(q);
  });

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC', fontFamily: 'sans-serif' }}>
      <Sidebar activeModule={activeModule} onSelect={m => { setActiveModule(m); load(m); }} totalOrders={uniqueTickets.length} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{uniqueTickets.length} unique items · Build 13</div>
          </div>
          <div style={{ flex: 1 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }} />
          <button onClick={() => { load(activeModule); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Refresh</button>
          <button onClick={() => setShowWebhookLog(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Webhook Log</button>
        </div>
        <div style={{ flex: 1, overflowX: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', gap: 15 }}>
            {(AIS_MINING_MODULES.includes(activeModule) ? AIS_MINING_COLUMNS : COLUMNS).map(col => (
              <KanbanColumn 
                key={`${activeModule}-${col}`} 
                col={col} 
                orders={filtered.filter(t => t.status === col)} 
                onMoveClick={(t) => setMoveTarget(t)} 
                onHistoryClick={setDetailOrder} 
                selectedIds={new Set()} 
                onToggleSelect={()=>{}} 
                onSelectAll={()=>{}} 
                bulkMode={false} 
                module={activeModule} 
              />
            ))}
          </div>
        </div>
      </div>
      {detailOrder && <DetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} onMoveClick={o => { setMoveTarget(o); setDetailOrder(null); }} />}
      {moveTarget && <MoveModal order={moveTarget} module={activeModule} onClose={() => setMoveTarget(null)} onMove={async (d) => {
        const raw = displayToRaw(d.targetCol);
        const ticket = uniqueTickets.find(t => String(t.id) === String(moveTarget.id));
        if (!ticket) return;
        try {
          // 1. Update module table
          await supabase.from(moveTarget._table).update({ status: raw, updated_at: new Date().toISOString(), ...d.extraFields }).eq('id', moveTarget.id);
          // 2. Sync to order_vehicles (if VIN exists)
          if (ticket.vin) {
            await supabase.from('order_vehicles').update({ status: raw, updated_at: new Date().toISOString() }).eq('vin', ticket.vin);
          }
          // 3. Write History & Webhook
          await writeHistory(ticket, ticket._rawStatus, raw, { notes: d.notes, metadata: d.extraFields });
          await fireOutboundWebhook(ticket, raw, d.extraFields);
          load(activeModule);
        } catch (err) { alert('Failed: ' + err.message); }
        setMoveTarget(null);
      }} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreated={() => setShowNewOrder(false)} />}
      {showWebhookLog && <WebhookLogPanel onClose={() => setShowWebhookLog(false)} />}
    </div>
  );
}
