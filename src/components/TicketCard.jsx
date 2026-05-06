import TicketCard from './TicketCard';

const COL_STYLES = {
  'Pending':    { accent: '#F59E0B', bg: '#1C1810', badge: '#78350F', label: '#FCD34D' },
  'In Process': { accent: '#3B82F6', bg: '#0F1E35', badge: '#1E3A5F', label: '#93C5FD' },
  'Completed':  { accent: '#10B981', bg: '#0D1F18', badge: '#064E3B', label: '#6EE7B7' },
  'On Hold':    { accent: '#8B5CF6', bg: '#160F2A', badge: '#2E1065', label: '#C4B5FD' },
  'Failed':     { accent: '#EF4444', bg: '#1F0F0F', badge: '#450A0A', label: '#FCA5A5' },
};

export default function KanbanColumn({ col, orders, onMoveClick, onHistoryClick, bulkMode, selectedIds, onSelect, onSelectAll }) {
  const style = COL_STYLES[col] || COL_STYLES['Pending'];
  const colIds = orders.map((o) => o.id);
  const allSelected = colIds.length > 0 && colIds.every((id) => selectedIds.includes(id));
  const someSelected = colIds.some((id) => selectedIds.includes(id));

  return (
    <div style={{ flex: 1, minWidth: 175 }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, padding: '8px 12px',
        background: style.bg, borderRadius: 8,
        border: `1px solid ${style.accent}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Select-all checkbox in bulk mode */}
          {bulkMode && (
            <div
              onClick={() => onSelectAll(colIds)}
              style={{
                width: 14, height: 14, borderRadius: 3,
                border: `2px solid ${allSelected ? style.accent : '#334155'}`,
                background: allSelected ? style.accent : someSelected ? style.accent + '50' : 'transparent',
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {allSelected && (
                <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M2 6l3 3 5-5"/>
                </svg>
              )}
              {!allSelected && someSelected && (
                <div style={{ width: 6, height: 2, background: style.label, borderRadius: 1 }} />
              )}
            </div>
          )}
          <div style={{ width: 3, height: 14, borderRadius: 2, background: style.accent }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: style.label, letterSpacing: 0.8 }}>
            {col.toUpperCase()}
          </span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: style.label, background: style.badge, borderRadius: 20, padding: '1px 8px' }}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ minHeight: 80 }}>
        {orders.map((order) => (
          <TicketCard
            key={order.id}
            order={order}
            onMoveClick={onMoveClick}
            onHistoryClick={onHistoryClick}
            bulkMode={bulkMode}
            selected={selectedIds.includes(order.id)}
            onSelect={onSelect}
          />
        ))}
        {orders.length === 0 && (
          <div style={{ border: '1px dashed #1E293B', borderRadius: 8, padding: '20px 10px', textAlign: 'center', fontSize: 10, color: '#334155', letterSpacing: 0.5 }}>
            NO TICKETS
          </div>
        )}
      </div>
    </div>
  );
}
