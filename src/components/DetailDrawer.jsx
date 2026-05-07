import { useState, useEffect } from 'react';
import { formatDate } from '../utils';
import { supabase } from '../supabaseClient';

const COL_STYLES = {
  Pending:       { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF' },
  'In Progress': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8' },
  Completed:     { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB' },
  'On Hold':     { bg: '#FFFDF0', text: '#966A00', border: '#FFE066' },
  Failed:        { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9' },
};

const PRIORITY_COLOR = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };

const MODULE_STAGE = {
  Orders: 'order', Shipment: 'shipment', Delivery: 'delivery',
  Installation: 'installation', AIS140: 'ais140', Mining: 'mining',
};

function toDisplayStatus(s) {
  const map = {
    pending: 'Pending', in_progress: 'In Progress',
    completed: 'Completed', on_hold: 'On Hold', failed: 'Failed',
  };
  return map[s] || s;
}

export default function DetailDrawer({ order, onClose, onMoveClick }) {
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (!order?.order_id && !order?.id) return;
    const orderId = order.order_id || order.id;
    const stage   = order._module ? MODULE_STAGE[order._module] : null;

    async function loadHistory() {
      setHistLoading(true);
      let query = supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (stage) query = query.eq('stage', stage);

      const { data, error } = await query;
      if (!error) setHistory(data || []);
      setHistLoading(false);
    }
    loadHistory();
  }, [order?.id, order?.order_id, order?._module]);

  if (!order) return null;

  const col = order.status || 'Pending';
  const cs  = COL_STYLES[col] || COL_STYLES['Pending'];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 800 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '95vw',
        background: '#fff', zIndex: 801, display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.10)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace", letterSpacing: 0.5, marginBottom: 3 }}>
                {order.tracking_id || order.id}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: "'DM Mono', monospace", letterSpacing: 0.3 }}>
                {order.vin || 'No VIN'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => onMoveClick(order)} style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 7, border: 'none',
                background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                Move →
              </button>
              <button onClick={onClose} style={{
                background: '#F1F5F9', border: 'none', borderRadius: 7,
                padding: '6px 10px', cursor: 'pointer', fontSize: 15, color: '#64748B', lineHeight: 1,
              }}>✕</button>
            </div>
          </div>

          {/* Status + Priority */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: cs.bg, color: cs.text, border: `1px solid ${cs.border}`,
            }}>{col}</span>
            {order.priority && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[order.priority] || '#F59E0B' }} />
                {order.priority}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* Order Details */}
          <Section title="Order Details">
            <Row label="Order ID"  value={order.order_id || order.id} mono />
            <Row label="Ticket No" value={order.ticket_no || order.order_number || '—'} mono />
            <Row label="Tracking"  value={order.tracking_id || '—'} mono />
            <Row label="Created"   value={formatDate(order.created_at)} />
            <Row label="Updated"   value={formatDate(order.updated_at)} />
          </Section>

          {/* Vehicle Details */}
          <Section title="Vehicle Details">
            <Row label="VIN"        value={order.vin} mono />
            <Row label="Model"      value={order.model || order.vehicle_details?.model || '—'} />
            <Row label="Make"       value={order.make  || order.vehicle_details?.make  || '—'} />
            <Row label="Reg. No."   value={order.registration_no || order.vehicle_details?.registration_no || '—'} mono />
            <Row label="Engine No." value={order.engine_no || order.vehicle_details?.engine_no || '—'} mono />
            <Row label="Fuel"       value={order.fuel_type || order.vehicle_details?.fuel_type || '—'} />
            <Row label="Emission"   value={order.emission_type || order.vehicle_details?.emission_type || '—'} />
            <Row label="Mfg. Year"  value={order.mfg_year || order.vehicle_details?.mfg_year || '—'} />
            <Row label="RTO"        value={[order.rto_office_code, order.rto_state].filter(Boolean).join(', ') || '—'} />
          </Section>

          {/* Customer Details */}
          {order.customer_details && (
            <Section title="Customer Details">
              <Row label="Name"  value={order.customer_details.name} />
              <Row label="Email" value={order.customer_details.email} />
              <Row label="Phone" value={order.customer_details.contact_number} />
              <Row label="PAN"   value={order.customer_details.pan} mono />
              <Row label="GST"   value={order.customer_details.gst} mono />
            </Section>
          )}

          {/* Shipment-specific */}
          {(order.courier || order.awb_number) && (
            <Section title="Shipment Details">
              <Row label="Courier"           value={order.courier || '—'} />
              <Row label="AWB Number"        value={order.awb_number || '—'} mono />
              <Row label="Expected Delivery" value={order.expected_delivery || '—'} />
              <Row label="Dispatched At"     value={formatDate(order.dispatched_at)} />
            </Section>
          )}

          {/* Delivery-specific */}
          {(order.delivered_to || order.delivery_date) && (
            <Section title="Delivery Details">
              <Row label="Delivered To"  value={order.delivered_to || '—'} />
              <Row label="Delivery Date" value={order.delivery_date || '—'} />
              <Row label="Address"       value={order.delivery_address || '—'} />
            </Section>
          )}

          {/* Installation-specific */}
          {(order.technician_name || order.scheduled_date) && (
            <Section title="Installation Details">
              <Row label="Technician"     value={order.technician_name || '—'} />
              <Row label="Scheduled Date" value={order.scheduled_date || '—'} />
              <Row label="Device Status"  value={order.device_status || '—'} />
            </Section>
          )}

          {/* Cert Tickets */}
          {(order.ais140_ticket_no || order.mining_ticket_no) && (
            <Section title="Cert Tickets">
              {order.ais140_ticket_no && <Row label="AIS140" value={order.ais140_ticket_no} mono />}
              {order.mining_ticket_no && <Row label="Mining" value={order.mining_ticket_no} mono />}
            </Section>
          )}

          {/* Activity History */}
          <Section title={`Activity History (${histLoading ? '…' : history.length})`}>
            {histLoading && (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Loading history…</div>
            )}
            {!histLoading && history.length === 0 && (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>No history yet.</div>
            )}
            {!histLoading && history.map((h, i, arr) => {
              const fromDisplay = toDisplayStatus(h.from_status);
              const toDisplay   = toDisplayStatus(h.to_status);
              const isCreated   = !h.from_status;
              return (
                <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  {/* Timeline dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: isCreated ? '#EFF6FF' : '#FFFBEB',
                      border: `2px solid ${isCreated ? '#BFDBFE' : '#FDE68A'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                    }}>
                      {isCreated ? '✦' : '↗'}
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: '#F1F5F9', minHeight: 14, marginTop: 3 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                        {isCreated ? 'Created' : 'Status Changed'}
                      </span>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{formatDate(h.created_at)}</span>
                    </div>

                    {/* From → To badges */}
                    {h.from_status ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <ColBadge col={fromDisplay} />
                        <span style={{ color: '#CBD5E1', fontSize: 10 }}>→</span>
                        <ColBadge col={toDisplay} />
                      </div>
                    ) : (
                      <div style={{ marginBottom: 4 }}>
                        <ColBadge col={toDisplay} />
                      </div>
                    )}

                    {/* Notes */}
                    {h.notes && (
                      <div style={{ fontSize: 11, color: '#475569', background: '#F8FAFC', borderRadius: 6, padding: '5px 9px', marginBottom: 5 }}>
                        {h.notes}
                      </div>
                    )}

                    {/* Changed by */}
                    {h.changed_by && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <InitialAvatar name={h.changed_by} />
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{h.changed_by}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Section>

        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 16 }}>
      <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0, minWidth: 100 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 500, textAlign: 'right', fontFamily: mono ? "'DM Mono', monospace" : 'inherit', wordBreak: 'break-all' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function ColBadge({ col }) {
  const cs = COL_STYLES[col] || COL_STYLES['Pending'];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>
      {col}
    </span>
  );
}

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#0D9488', '#D97706', '#059669'];
function InitialAvatar({ name }) {
  if (!name) return null;
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const color    = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}
