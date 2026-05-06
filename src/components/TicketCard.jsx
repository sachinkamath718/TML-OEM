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
        background: selected ? '#EFF6FF' : hovered ? '#F8FAFC' : '#fff',
        border: `1px solid ${selected ? '#2563EB' : hovered ? '#CBD5E1' : '#E2E8F0'}`,
        borderRadius: 7,
        padding: '8px 11px',
        marginBottom: 5,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: selected ? '0 0 0 2px rgba(37,99,235,0.15)' : hovered ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {/* Checkbox in bulk mode */}
      {bulkMode && (
        <div style={{
          width: 15, height: 15, borderRadius: 4,
          border: `2px solid ${selected ? '#2563EB' : '#CBD5E1'}`,
          background: selected ? '#2563EB' : '#fff',
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
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[order.priority] || '#F59E0B', flexShrink: 0 }} />

      {/* VIN + Tracking ID */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#1E293B', fontFamily: "'DM Mono', monospace", letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {order.vin || 'No VIN'}
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginTop: 1, letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {order.tracking_id || order.id}
        </div>
      </div>

      {/* Move button — hidden in bulk mode */}
      {!bulkMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
          style={{
            fontSize: 10, padding: '3px 9px', borderRadius: 5,
            border: '1px solid #BFDBFE', background: '#EFF6FF',
            color: '#2563EB', cursor: 'pointer', fontWeight: 600,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            flexShrink: 0, transition: 'all 0.12s',
          }}
        >
          Move
        </button>
      )}
    </div>
  );
}
