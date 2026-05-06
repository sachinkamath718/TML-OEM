import { formatDate } from '../utils';
import Avatar from './Avatar';

const STATUS_COLORS = {
  'Pending':    { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  'In Process': { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  'Completed':  { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  'On Hold':    { bg: '#F5F3FF', color: '#4C1D95', border: '#DDD6FE' },
  'Failed':     { bg: '#FEF2F2', color: '#7F1D1D', border: '#FECACA' },
};

export default function HistoryModal({ order, onClose }) {
  const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS['Pending'];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 580, maxWidth: '94vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{order.id}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: -0.2 }}>{order.title}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{order.customer}</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#64748B', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {order.tracking_id && (
              <div style={{ fontSize: 11, background: '#F8FAFC', padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#94A3B8' }}>Tracking: </span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: '#2563EB', fontWeight: 500 }}>{order.tracking_id}</span>
              </div>
            )}
            {order.vin && (
              <div style={{ fontSize: 11, background: '#F8FAFC', padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#94A3B8' }}>VIN: </span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: '#374151', fontWeight: 500 }}>{order.vin}</span>
              </div>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, padding: '4px 12px', borderRadius: 20, border: `1px solid ${statusStyle.border}` }}>
              {order.status}
            </span>
            {order.priority && (
              <span style={{ fontSize: 11, color: '#64748B', background: '#F8FAFC', padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                {order.priority} Priority
              </span>
            )}
          </div>

          {/* Tags */}
          {order.tags && order.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {order.tags.map((t) => (
                <span key={t} style={{ fontSize: 10, background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Activity count */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 18, letterSpacing: 0.8 }}>
          ACTIVITY HISTORY · {order.history ? order.history.length : 0} EVENTS
        </div>

        {/* Timeline */}
        {order.history && order.history.slice().reverse().map((h, i, arr) => (
          <div key={h.id} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: h.action === 'Order Created' ? '#EFF6FF' : '#FFFBEB',
                border: `2px solid ${h.action === 'Order Created' ? '#2563EB' : '#F59E0B'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={h.action === 'Order Created' ? '#2563EB' : '#F59E0B'} strokeWidth="2.5">
                  {h.action === 'Order Created'
                    ? <path d="M12 5v14M5 12h14"/>
                    : <path d="M5 12h14M12 5l7 7-7 7"/>
                  }
                </svg>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1, flex: 1, background: '#E2E8F0', minHeight: 20, marginTop: 4 }} />
              )}
            </div>

            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{h.action}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>{formatDate(h.timestamp)}</div>
              </div>

              {h.from && (
                <div style={{ fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: STATUS_COLORS[h.from]?.bg || '#F1F5F9', color: STATUS_COLORS[h.from]?.color || '#374151', fontWeight: 600, border: `1px solid ${STATUS_COLORS[h.from]?.border || '#E2E8F0'}` }}>
                    {h.from}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: STATUS_COLORS[h.to]?.bg || '#F1F5F9', color: STATUS_COLORS[h.to]?.color || '#374151', fontWeight: 600, border: `1px solid ${STATUS_COLORS[h.to]?.border || '#E2E8F0'}` }}>
                    {h.to}
                  </span>
                </div>
              )}

              <div style={{ fontSize: 12, color: '#475569', background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', marginBottom: 8, lineHeight: 1.6, border: '1px solid #F1F5F9' }}>
                {h.note}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={h.user.name} size={20} />
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{h.user.name}</span>
                {h.user.phone && h.user.phone !== '—' && <span style={{ fontSize: 11, color: '#94A3B8' }}>· {h.user.phone}</span>}
                {h.user.role && <span style={{ fontSize: 11, color: '#94A3B8' }}>· {h.user.role}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
