import { formatDate } from '../utils';

const COL_STYLES = {
  Pending:      { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF' },
  'In Process': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8' },
  Completed:    { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB' },
  'On Hold':    { bg: '#FFFDF0', text: '#966A00', border: '#FFE066' },
  Failed:       { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9' },
};

const PRIORITY_COLOR = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };

export default function DetailDrawer({ order, onClose, onMoveClick }) {
  if (!order) return null;
  const col = order.status || 'Pending';
  const cs = COL_STYLES[col] || COL_STYLES['Pending'];
  const history = order.history || [];

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
            <Row label="Order ID"    value={order.order_id || order.id} mono />
            <Row label="Customer"    value={order.customer} />
            <Row label="Module"      value={order.module} />
            <Row label="Assignee"    value={order.assignee || '—'} />
            <Row label="Created"     value={formatDate(order.created_at)} />
          </Section>

          {/* Vehicle */}
          <Section title="Vehicle Details">
            <Row label="VIN"         value={order.vin} mono />
            <Row label="Model"       value={order.model || order.vehicle_details?.model || '—'} />
            <Row label="Make"        value={order.make  || order.vehicle_details?.make  || '—'} />
            <Row label="Reg. No."    value={order.registration_no || order.vehicle_details?.registration_no || '—'} mono />
            <Row label="Engine No."  value={order.vehicle_details?.engine_no || '—'} mono />
            <Row label="Fuel"        value={order.vehicle_details?.fuel_type || '—'} />
            <Row label="Emission"    value={order.vehicle_details?.emission_type || '—'} />
            <Row label="Mfg. Year"   value={order.vehicle_details?.mfg_year || '—'} />
            <Row label="RTO"         value={[order.vehicle_details?.rto_office_code, order.vehicle_details?.rto_state].filter(Boolean).join(', ') || '—'} />
          </Section>

          {/* Customer */}
          {order.customer_details && (
            <Section title="Customer Details">
              <Row label="Name"   value={order.customer_details.name} />
              <Row label="Email"  value={order.customer_details.email} />
              <Row label="Phone"  value={order.customer_details.contact_number} />
              <Row label="PAN"    value={order.customer_details.pan} mono />
              <Row label="GST"    value={order.customer_details.gst} mono />
            </Section>
          )}

          {/* Products / Tags */}
          {order.tags && order.tags.length > 0 && (
            <Section title="Products">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {order.tags.map((t) => (
                  <span key={t} style={{
                    fontSize: 11, background: '#EFF6FF', color: '#2563EB',
                    padding: '3px 10px', borderRadius: 12, fontWeight: 600,
                  }}>{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Cert tickets */}
          {(order.ais140_ticket_no || order.mining_ticket_no) && (
            <Section title="Cert Tickets">
              {order.ais140_ticket_no && <Row label="AIS140" value={order.ais140_ticket_no} mono />}
              {order.mining_ticket_no && <Row label="Mining" value={order.mining_ticket_no} mono />}
            </Section>
          )}

          {/* History */}
          <Section title={`Activity History (${history.length})`}>
            {history.length === 0 && (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>No history yet.</div>
            )}
            {[...history].reverse().map((h, i, arr) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: h.action.includes('Created') ? '#EFF6FF' : '#FFFBEB',
                    border: `2px solid ${h.action.includes('Created') ? '#BFDBFE' : '#FDE68A'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  }}>
                    {h.action.includes('Created') ? '✦' : '↗'}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: '#F1F5F9', minHeight: 14, marginTop: 3 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{h.action}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{formatDate(h.timestamp)}</span>
                  </div>

                  {h.from && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <ColBadge col={h.from} />
                      <span style={{ color: '#CBD5E1', fontSize: 10 }}>→</span>
                      <ColBadge col={h.to} />
                    </div>
                  )}

                  {h.note && (
                    <div style={{ fontSize: 11, color: '#475569', background: '#F8FAFC', borderRadius: 6, padding: '5px 9px', marginBottom: 5 }}>
                      {h.note}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <InitialAvatar name={h.user?.name} />
                    <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{h.user?.name}</span>
                    {h.user?.phone && h.user.phone !== '—' && (
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>· {h.user.phone}</span>
                    )}
                    {h.user?.role && (
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>· {h.user.role}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
  const cs = COL_STYLES[col] || {};
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
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}
