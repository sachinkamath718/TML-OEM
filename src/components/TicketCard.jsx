import { useState } from 'react';
import { PRIORITY_COLORS } from '../constants';
import Avatar from './Avatar';

export default function TicketCard({ order, onMoveClick, onHistoryClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onHistoryClick(order)}
      style={{
        background: hovered ? '#F8FAFF' : '#fff',
        border: '1px solid ' + (hovered ? '#A5B4FC' : '#E5E7EB'),
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: hovered
          ? '0 4px 16px rgba(99,102,241,0.10)'
          : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, letterSpacing: 0.5, fontFamily: 'monospace' }}>
          {order.id}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 20,
            background: PRIORITY_COLORS[order.priority].bg,
            color: PRIORITY_COLORS[order.priority].text,
          }}
        >
          {order.priority}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4, lineHeight: 1.3 }}>
        {order.title}
      </div>

      {/* Customer */}
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>{order.customer}</div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {order.tags.map((t) => (
          <span
            key={t}
            style={{ fontSize: 10, background: '#EEF2FF', color: '#4338CA', padding: '1px 7px', borderRadius: 12, fontWeight: 500 }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* VIN */}
      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8 }}>
      <span style={{ fontFamily: 'monospace' }}>VIN: {order.vin ? order.vin.slice(0, 8) + '…' : 'N/A'}</span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {order.assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Avatar name={order.assignee} size={20} />
            <span style={{ fontSize: 10, color: '#6B7280' }}>{order.assignee.split(' ')[0]}</span>
          </div>
        ) : (
          <span style={{ fontSize: 10, color: '#D1D5DB' }}>Unassigned</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>
            {order.history.length} update{order.history.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
            style={{
              fontSize: 10,
              padding: '3px 9px',
              borderRadius: 6,
              border: '1px solid #E0E7FF',
              background: '#EEF2FF',
              color: '#4338CA',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Move →
          </button>
        </div>
      </div>
    </div>
  );
}
