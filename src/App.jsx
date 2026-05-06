import { useState, useEffect } from 'react';
import { COLUMNS } from './constants';
import { generateId } from './utils';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import HistoryModal from './components/HistoryModal';
import NewOrderModal from './components/NewOrderModal';

import { supabase } from './supabaseClient';

export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch] = useState('');

  // ─── Fetch orders from Supabase on mount ───────────────────────────────────
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please check your Supabase connection.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  // ─── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Filter by active module + search ─────────────────────────────────────
  const filteredOrders = orders
    .filter((o) => o.module === activeModule)
    .filter(
      (o) =>
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase())
    );

  // ─── Move ticket to a new status ──────────────────────────────────────────
  async function handleMove({ targetCol, user, note }) {
    const order = orders.find((o) => o.id === moveTarget.id);
    if (!order) return;

    const newHistoryEntry = {
      id: 'h-' + generateId(),
      action: 'Status Changed',
      from: order.status,
      to: targetCol,
      timestamp: new Date().toISOString(),
      user,
      note,
    };

    const updatedHistory = [...(order.history || []), newHistoryEntry];

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: targetCol,
          assignee: user.name,
          history: updatedHistory,
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== moveTarget.id) return o;
          return {
            ...o,
            status: targetCol,
            assignee: user.name,
            history: updatedHistory,
          };
        })
      );

      if (historyTarget && historyTarget.id === moveTarget.id) {
        setHistoryTarget((prev) => ({
          ...prev,
          status: targetCol,
          assignee: user.name,
          history: updatedHistory,
        }));
      }

      // ── Webhook triggers (per spec) ──────────────────────────────────────
      if (
        (activeModule === 'Shipment' || activeModule === 'Installation') &&
        targetCol === 'Completed'
      ) {
        console.log(`Webhook: ${activeModule} → Completed for order ${order.id}`);
      }

      if (activeModule === 'AIS140' || activeModule === 'Mining') {
        if (targetCol === 'In Process' || targetCol === 'Completed') {
          console.log(`Webhook: ${activeModule} → ${targetCol} for order ${order.id}`);
        }
      }
    } catch (err) {
      console.error('Error moving order:', err);
      alert('Failed to update order status. Please try again.');
    }

    setMoveTarget(null);
  }

  // ─── Create orders (one per module) ───────────────────────────────────────
  async function handleCreate(newOrders) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(newOrders)
        .select();

      if (error) throw error;

      setOrders((prev) => [...(data || newOrders), ...prev]);
      setShowNewOrder(false);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to create order. Please try again.');
    }
  }

  const inProcessCount = filteredOrders.filter((o) => o.status === 'In Process').length;

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F9FB',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#6B7280',
          fontSize: 15,
        }}
      >
        Loading orders…
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F9FB',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #FCA5A5',
            borderRadius: 12,
            padding: '24px 32px',
            color: '#DC2626',
            fontSize: 14,
            maxWidth: 420,
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Connection Error</div>
          {error}
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        minHeight: '100vh',
        background: '#F8F9FB',
        display: 'flex',
      }}
    >
      <Sidebar
        activeModule={activeModule}
        onSelect={setActiveModule}
        totalOrders={orders.filter((o) => o.module === activeModule).length}
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
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {activeModule}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
              {orders.filter((o) => o.module === activeModule).length} total · {inProcessCount} in progress
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, IDs, customers…"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              width: 260,
              outline: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          />

          <button
            onClick={() => setShowNewOrder(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#4F46E5',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
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
                orders={filteredOrders.filter((o) => o.status === col)}
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
