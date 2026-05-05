import { COL_COLORS } from '../constants';
import TicketCard from './TicketCard';

export default function KanbanColumn({ col, orders, onMoveClick, onHistoryClick }) {
  const { bg, text, border } = COL_COLORS[col];

  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '8px 12px',
          background: bg,
          borderRadius: 8,
          border: `1px solid ${border}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: text, letterSpacing: 0.3 }}>
          {col.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: 11, fontWeight: 700, color: text,
            background: '#fff', borderRadius: 12, padding: '1px 8px',
            border: `1px solid ${border}`,
          }}
        >
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ minHeight: 100 }}>
        {orders.map((order) => (
          <TicketCard
            key={order.id}
            order={order}
            onMoveClick={onMoveClick}
            onHistoryClick={onHistoryClick}
          />
        ))}
        {orders.length === 0 && (
          <div
            style={{
              border: '2px dashed #E5E7EB', borderRadius: 10,
              padding: '24px 12px', textAlign: 'center',
              fontSize: 12, color: '#D1D5DB',
            }}
          >
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}
