import { useState } from 'react';

const PRIORITY_DOT = {
  High:   '#EF4444',
  Medium: '#F59E0B',
  Low:    '#10B981',
};

export default function TicketCard({ order, onMoveClick, onHistoryClick, selected, onSelect, bulkMode }) {
  const [hovered, setHovered] = useState(false);

  function handleClick() {
    if (bulkMode) {
      onSelect(order.id);
    } else {
      onHistoryClick(order);
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        background: selected ? '#1a2f4a' : hovered ? '#1A1F2E' : '#141820',
        border: `1px solid ${selected ? '#3B82F6' : hovered ? '#2D3748' : '#1E293B'}`,
        borderRadius: 7,
        padding: '8px 12px',
        marginBottom: 5,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Checkbox in bulk mode */}
      {bulkMode && (
        <div style={{
          width: 15, height: 15, borderRadius: 4,
          border: `2px solid ${selected ? '#3B82F6' : '#334155'}`,
          background: selected ? '#3B82F6' : 'transparent',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s',
        }}>
          {selected && (
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M2 6l3 3 5-5"/>
            </svg>
          )}
        </div>
      )}

      {/* Priority dot */}
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_DOT[order.priority] || '#F59E0B', flexShrink: 0 }} />

      {/* VIN + Tracking ID */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#CBD5E1', fontFamily: "'DM Mono', monospace", letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {order.vin || 'No VIN'}
        </div>
        <div style={{ fontSize: 10, color: '#475569', fontFamily: "'DM Mono', monospace", marginTop: 1, letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {order.tracking_id || order.id}
        </div>
      </div>

      {/* Move button — hidden in bulk mode */}
      {!bulkMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
          style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4,
            border: '1px solid #1E3A5F', background: 'transparent',
            color: '#60A5FA', cursor: 'pointer', fontWeight: 600,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            flexShrink: 0, letterSpacing: 0.2,
            transition: 'all 0.12s',
          }}
        >
          Move
        </button>
      )}
    </div>
  );
}
