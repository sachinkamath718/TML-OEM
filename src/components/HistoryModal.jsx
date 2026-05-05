import { COL_COLORS } from '../constants';
import { formatDate } from '../utils';
import Avatar from './Avatar';

export default function HistoryModal({ order, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          width: 560, maxWidth: '94vw', maxHeight: '85vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 20, borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>{order.id}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{order.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{order.customer}</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#6B7280' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>Tracking ID: </span>
              <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>{order.tracking_Id}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>VIN: </span>
              <span style={{ fontFamily: 'monospace' }}>{order.vin}</span>
            </div>
            <span
              style={{
                padding: '2px 10px', borderRadius: 20, fontWeight: 600,
               background: COL_COLORS[order.status]?.bg,
               color: COL_COLORS[order.status]?.text,
               fontSize: 11,
}}
           >
          {order.status}
            </span>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>
          Activity History ({order.history.length})
        </div>

        {/* Timeline */}
        {order.history
          .slice()
          .reverse()
          .map((h, i, arr) => (
            <div key={h.id} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              {/* Dot + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: h.action === 'Order Created' ? '#EEF2FF' : '#FEF3C7',
                    border: `2px solid ${h.action === 'Order Created' ? '#A5B4FC' : '#FCD34D'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}
                >
                  {h.action === 'Order Created' ? '✦' : '↗'}
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: '#E5E7EB', minHeight: 20, marginTop: 4 }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{h.action}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{formatDate(h.timestamp)}</div>
                </div>

                {h.from && (
                  <div style={{ fontSize: 11, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ padding: '1px 8px', borderRadius: 10, background: COL_COLORS[h.from]?.bg, color: COL_COLORS[h.from]?.text, fontWeight: 600 }}>
                      {h.from}
                    </span>
                    <span style={{ color: '#9CA3AF' }}>→</span>
                    <span style={{ padding: '1px 8px', borderRadius: 10, background: COL_COLORS[h.to]?.bg, color: COL_COLORS[h.to]?.text, fontWeight: 600 }}>
                      {h.to}
                    </span>
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#4B5563', background: '#F9FAFB', borderRadius: 8, padding: '7px 10px', marginBottom: 6 }}>
                  {h.note}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={h.user.name} size={20} />
                  <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{h.user.name}</span>
                  {h.user.phone !== '—' && <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {h.user.phone}</span>}
                  {h.user.role && <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {h.user.role}</span>}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
