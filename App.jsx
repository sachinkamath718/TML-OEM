import { useState } from 'react';
import { COLUMNS, MODULE_ICONS } from './constants';
import { generateId } from './utils';
import { SAMPLE_ORDERS } from './sampleData';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import HistoryModal from './components/HistoryModal';
import NewOrderModal from './components/NewOrderModal';

export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [orders, setOrders] = useState(SAMPLE_ORDERS);
  const [moveTarget, setMoveTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
  );

  function handleMove({ targetCol, user, note }) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== moveTarget.id) return o;
        return {
          ...o,
          column: targetCol,
          assignee: user.name,
          history: [
            ...o.history,
            {
              id: 'h-' + generateId(),
              action: 'Status Changed',
              from: o.column,
              to: targetCol,
              timestamp: new Date().toISOString(),
              user,
              note,
            },
          ],
        };
      })
    );
    // Update historyTarget if it's open for the same order
    if (historyTarget && historyTarget.id === moveTarget.id) {
      setHistoryTarget((prev) => ({
        ...prev,
        column: targetCol,
        assignee: user.name,
      }));
    }
    setMoveTarget(null);
  }

  function handleCreate(newOrder) {
    setOrders((prev) => [newOrder, ...prev]);
    setShowNewOrder(false);
  }

  const inProcessCount = filteredOrders.filter((o) => o.column === 'In Process').length;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', background: '#F8F9FB', display: 'flex' }}>
      <Sidebar
        activeModule={activeModule}
        onSelect={setActiveModule}
        totalOrders={orders.length}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{MODULE_ICONS[activeModule]}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{activeModule}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
              {orders.length} total · {inProcessCount} in progress
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, IDs, customers…"
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', fontSize: 13,
              width: 260, outline: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          />

          <button
            onClick={() => setShowNewOrder(true)}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: '#4F46E5', color: '#fff', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            + New Order
          </button>
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 14, minWidth: 950 }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                col={col}
                orders={filteredOrders.filter((o) => o.column === col)}
                onMoveClick={setMoveTarget}
                onHistoryClick={setHistoryTarget}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {moveTarget && (
        <MoveModal
          order={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMove={handleMove}
        />
      )}
      {historyTarget && (
        <HistoryModal
          order={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
