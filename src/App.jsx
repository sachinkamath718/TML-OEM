import { useState, useEffect } from 'react';
import { COLUMNS } from './constants';
import { generateId } from './utils';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import HistoryModal from './components/HistoryModal';
import NewOrderModal from './components/NewOrderModal';
import BulkMoveModal from './components/BulkMoveModal';

import { supabase } from './supabaseClient';

const MODULE_ICONS = {
  Orders: null, Shipment: null, Delivery: null,
  Installation: null, AIS140: null, Mining: null,
};

export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch] = useState('');

  // Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkMove, setShowBulkMove] = useState(false);

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

  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') setOrders((prev) => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE') setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new : o));
        else if (payload.eventType === 'DELETE') setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Reset bulk selection when module changes
  useEffect(() => {
    setBulkMode(false);
    setSelectedIds([]);
  }, [activeModule]);

  const moduleOrders = orders.filter((o) => o.module === activeModule);
  const filteredOrders = moduleOrders.filter(
    (o) =>
      (o.vin || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.tracking_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.id || '').toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(ids) {
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  function exitBulkMode() {
    setBulkMode(false);
    setSelectedIds([]);
  }

  // Single move
  async function handleMove({ targetCol, user, note }) {
    const order = orders.find((o) => o.id === moveTarget.id);
    if (!order) return;
    const newEntry = {
      id: 'h-' + generateId(),
      action: 'Status Changed',
      from: order.status,
      to: targetCol,
      timestamp: new Date().toISOString(),
      user,
      note,
    };
    const updatedHistory = [...(order.history || []), newEntry];
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: targetCol, assignee: user.name, history: updatedHistory })
        .eq('id', order.id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => o.id !== moveTarget.id ? o : { ...o, status: targetCol, assignee: user.name, history: updatedHistory }));
      if (historyTarget && historyTarget.id === moveTarget.id) {
        setHistoryTarget((prev) => ({ ...prev, status: targetCol, assignee: user.name, history: updatedHistory }));
      }
    } catch (err) {
      console.error('Error moving order:', err);
      alert('Failed to update order status.');
    }
    setMoveTarget(null);
  }

  // Bulk move
  async function handleBulkMove({ targetCol, user, note }) {
    const targets = orders.filter((o) => selectedIds.includes(o.id));
    const timestamp = new Date().toISOString();

    try {
      await Promise.all(
        targets.map(async (order) => {
          const newEntry = {
            id: 'h-' + generateId(),
            action: 'Bulk Status Change',
            from: order.status,
            to: targetCol,
            timestamp,
            user,
            note,
          };
          const updatedHistory = [...(order.history || []), newEntry];
          const { error } = await supabase
            .from('orders')
            .update({ status: targetCol, assignee: user.name, history: updatedHistory })
            .eq('id', order.id);
          if (error) throw error;
          return { id: order.id, updatedHistory };
        })
      );

      setOrders((prev) =>
        prev.map((o) => {
          if (!selectedIds.includes(o.id)) return o;
          const newEntry = {
            id: 'h-' + generateId(),
            action: 'Bulk Status Change',
            from: o.status,
            to: targetCol,
            timestamp,
            user,
            note,
          };
          return { ...o, status: targetCol, assignee: user.name, history: [...(o.history || []), newEntry] };
        })
      );

      setShowBulkMove(false);
      exitBulkMode();
    } catch (err) {
      console.error('Error bulk moving:', err);
      alert('Failed to update some orders. Please try again.');
    }
  }

  async function handleCreate(newOrders) {
    try {
      const { data, error } = await supabase.from('orders').insert(newOrders).select();
      if (error) throw error;
      setOrders((prev) => [...(data || newOrders), ...prev]);
      setShowNewOrder(false);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to create order. Please try again.');
    }
  }

  const inProcessCount = moduleOrders.filter((o) => o.status === 'In Process').length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1117', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #1E293B', borderTop: '3px solid #3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <div style={{ color: '#475569', fontSize: 13, letterSpacing: 0.5 }}>Loading workspace...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1117', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ background: '#1A1F2E', border: '1px solid #EF444430', borderRadius: 12, padding: '28px 36px', color: '#EF4444', fontSize: 14, maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#F1F5F9' }}>Connection Error</div>
          <div style={{ color: '#94A3B8' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh', background: '#0F1117', display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 4px; }
        input::placeholder, textarea::placeholder { color: #475569; }
        input:focus, textarea:focus, select:focus { border-color: #3B82F6 !important; outline: none; }
      `}</style>

      <Sidebar activeModule={activeModule} onSelect={setActiveModule} totalOrders={moduleOrders.length} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: '#0A0D14', borderBottom: '1px solid #1E293B', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', letterSpacing: -0.2 }}>{activeModule}</div>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 0.5 }}>
              {moduleOrders.length} TOTAL · {inProcessCount} IN PROGRESS
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Bulk mode controls */}
          {bulkMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#60A5FA', fontWeight: 600 }}>
                {selectedIds.length} selected
              </div>
              <button
                onClick={() => selectedIds.length > 0 && setShowBulkMove(true)}
                disabled={selectedIds.length === 0}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: selectedIds.length > 0 ? '#3B82F6' : '#1E293B',
                  color: selectedIds.length > 0 ? '#fff' : '#475569',
                  fontSize: 12, fontWeight: 600, cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Move Selected
              </button>
              <button
                onClick={exitBulkMode}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #1E293B', background: 'transparent', color: '#64748B', fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search VIN, tracking ID, customer..."
                  style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid #1E293B', background: '#141820', fontSize: 12, width: 260, color: '#F1F5F9', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                />
              </div>

              <button
                onClick={() => setBulkMode(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1E3A5F', background: 'transparent', color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="4" height="4" rx="1"/><rect x="3" y="11" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/>
                  <path d="M11 7h10M11 13h10M11 19h10"/>
                </svg>
                Bulk Select
              </button>

              <button
                onClick={() => setShowNewOrder(true)}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                New Order
              </button>
            </>
          )}
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 28px' }}>
          <div style={{ display: 'flex', gap: 14, minWidth: 900 }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                col={col}
                orders={filteredOrders.filter((o) => o.status === col)}
                onMoveClick={setMoveTarget}
                onHistoryClick={setHistoryTarget}
                bulkMode={bulkMode}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
                onSelectAll={toggleSelectAll}
              />
            ))}
          </div>
        </div>
      </div>

      {moveTarget && <MoveModal order={moveTarget} onClose={() => setMoveTarget(null)} onMove={handleMove} />}
      {historyTarget && <HistoryModal order={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />}
      {showBulkMove && (
        <BulkMoveModal
          count={selectedIds.length}
          onClose={() => setShowBulkMove(false)}
          onMove={handleBulkMove}
        />
      )}
    </div>
  );
}
