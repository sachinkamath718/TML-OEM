import TicketCard from './TicketCard';

const COL_STYLES = {
  Pending:       { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF', dot: '#4C6EF5' },
  'In Progress': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8', dot: '#F76707' },
  Completed:     { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB', dot: '#2F9E44' },
  'On Hold':     { bg: '#FFFDF0', text: '#966A00', border: '#FFE066', dot: '#E67700' },
  Failed:        { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9', dot: '#E03131' },
  Cancelled:     { bg: '#FDF4FF', text: '#86198F', border: '#F0ABFC', dot: '#9C36B5' },
  'Cancelled Due To Change Request': { bg: '#FFF0F3', text: '#9F1239', border: '#FECDD3', dot: '#BE123C' },
};

export default function KanbanColumn({ col, orders, onMoveClick, onHistoryClick, selectedIds, onToggleSelect, onSelectAll, bulkMode, module }) {
  const cs          = COL_STYLES[col] || COL_STYLES['Pending'];
  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const someSelected = !allSelected && orders.some((o) => selectedIds.has(o.id));
  // Abbreviate very long column names
  const colLabel = col === 'Cancelled Due To Change Request' ? 'CDTCR' : col.toUpperCase();

  return (
    <div style={{ flex: 1, minWidth: 195, maxWidth: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '7px 11px', background: cs.bg, borderRadius: 8, border: `1px solid ${cs.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {bulkMode && orders.length > 0 && (
            <div
              onClick={() => onSelectAll(orders.map((o) => o.id), !allSelected)}
              style={{ width: 14, height: 14, borderRadius: 3, cursor: 'pointer', flexShrink: 0, border: `2px solid ${allSelected ? '#2563EB' : someSelected ? '#93C5FD' : cs.text}`, background: allSelected ? '#2563EB' : someSelected ? '#DBEAFE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {allSelected && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-5" /></svg>}
              {someSelected && !allSelected && <div style={{ width: 6, height: 2, background: '#2563EB', borderRadius: 1 }} />}
            </div>
          )}
          <span
            style={{ fontSize: 11, fontWeight: 700, color: cs.text, letterSpacing: 0.3 }}
            title={col}
          >
            {colLabel}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: cs.text, background: '#fff', borderRadius: 10, padding: '1px 8px', border: `1px solid ${cs.border}` }}>
          {orders.length}
        </span>
      </div>

      <div style={{ minHeight: 60 }}>
        {orders.map((order) => (
          <TicketCard
            key={order.id}
            order={order}
            module={module}
            onMoveClick={onMoveClick}
            onHistoryClick={onHistoryClick}
            selected={selectedIds.has(order.id)}
            onSelect={onToggleSelect}
            bulkMode={bulkMode}
          />
        ))}
        {orders.length === 0 && (
          <div style={{ border: '1.5px dashed #E2E8F0', borderRadius: 8, padding: '22px 10px', textAlign: 'center', fontSize: 11, color: '#CBD5E1' }}>
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}
