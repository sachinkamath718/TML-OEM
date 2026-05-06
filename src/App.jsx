import { useState, useEffect } from 'react';
import { COLUMNS } from './constants';
import { generateId } from './utils';
import { createOrder } from './api';

import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn';
import MoveModal from './components/MoveModal';
import DetailDrawer from './components/DetailDrawer';
import BulkMoveModal from './components/BulkMoveModal';
import NewOrderModal from './components/NewOrderModal';

import { supabase } from './supabaseClient';

export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [moveTarget, setMoveTarget]     = useState(null);
  const [detailOrder, setDetailOrder]   = useState(null);

  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkMode, setBulkMode]         = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch]             = useState('');

  // ─── Fetch ─────────────────────────────────────────────────────────────────
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
        setError('Failed to load orders. Please check your Supabase connection.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // ─── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new : o));
          setDetailOrder((prev) => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
        } else if (payload.eventType === 'DELETE') {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filteredOrders = orders
    .filter((o) => o.module === activeModule)
    .filter((o) =>
      [o.vin, o.tracking_id, o.customer, o.id, o.title]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(search.toLowerCase()))
    );

  // ─── Selection helpers ─────────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll(ids, select) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function exitBulkMode() {
    setSelectedIds(new Set());
    setBulkMode(false);
  }

  // ─── Single move ───────────────────────────────────────────────────────────
  async function handleMove({ targetCol, user, note }) {
    const order = orders.find((o) => o.id === moveTarget.id);
    if (!order) return;

    const newEntry = {
      id:        'h-' + generateId(),
      action:    'Status Changed',
      from:      order.status,
      to:        targetCol,
      timestamp: new Date().toISOString(),
      user, note,
    };
    const updatedHistory = [...(order.history || []), newEntry];

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: targetCol, assignee: user.name, history: updatedHistory })
        .eq('id', order.id);
      if (error) throw error;

      setOrders((prev) => prev.map((o) =>
        o.id === order.id ? { ...o, status: targetCol, assignee: user.name, history: updatedHistory } : o
      ));
      setDetailOrder((prev) =>
        prev?.id === order.id ? { ...prev, status: targetCol, assignee: user.name, history: updatedHistory } : prev
      );
    } catch (err) {
      alert('Failed to update status. Please try again.');
    }
    setMoveTarget(null);
  }

  // ─── Bulk move ─────────────────────────────────────────────────────────────
  async function handleBulkMove({ targetCol, user, note }) {
    const ids = [...selectedIds];
    const now = new Date().toISOString();

    const updates = ids.map((id) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return null;
      return {
        id,
        status:   targetCol,
        assignee: user.name,
        history:  [...(order.history || []), {
          id:        'h-' + generateId(),
          action:    'Status Changed',
          from:      order.status,
          to:        targetCol,
          timestamp: now,
          user, note,
        }],
      };
    }).filter(Boolean);

    try {
      await Promise.all(
        updates.map(({ id, status, assignee, history }) =>
          supabase.from('orders').update({ status, assignee, history }).eq('id', id)
        )
      );
      setOrders((prev) =>
        prev.map((o) => {
          const u = updates.find((x) => x.id === o.id);
          return u ? { ...o, ...u } : o;
        })
      );
      exitBulkMode();
      setShowBulkMove(false);
    } catch (err) {
      alert('Bulk update failed. Please try again.');
    }
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(tmlPayload, supabaseOrders) {
    try {
      // Step 1: Hit TML API
      const { data: tmlData, error: tmlError } = await createOrder(tmlPayload);
      if (tmlError) {
        alert('TML API error: ' + tmlError);
        return;
      }

      // Step 2: Merge TML tracking IDs into Supabase rows
      const enrichedOrders = supabaseOrders.map((order) => {
        const tmlVehicle = tmlData.find((t) => t.vin === order.vin);
        return {
          ...order,
          tml_tracking_id:  tmlVehicle?.order_tracking_id || null,
          ais140_ticket_no: tmlVehicle?.ais140_ticket_no  || null,
          mining_ticket_no: tmlVehicle?.mining_ticket_no  || null,
        };
      });

      // Step 3: Save to Supabase
      const { data, error } = await supabase.from('orders').insert(enrichedOrders).select();
      if (error) throw error;

      setOrders((prev) => [...(data || enrichedOrders), ...prev]);
      setShowNewOrder(false);
    } catch (err) {
      alert('Failed to create order: ' + err.message);
    }
  }

  const moduleOrders = orders.filter((o) => o.module === activeModule);
  const inProcessCount = moduleOrders.filter((o) => o.status === 'In Process').length;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#64748B', fontSize: 14 }}>
        Loading orders…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ background: '#fff', border: '1px solid #FCA5A5', borderRadius: 12, padding: '24px 32px', color: '#DC2626', fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Connection Error</div>
          {error}
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh', background: '#F8FAFC', display: 'flex' }}>
      <Sidebar
        activeModule={activeModule}
        onSelect={(m) => { setActiveModule(m); exitBulkMode(); }}
        totalOrders={moduleOrders.length}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Top bar ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: -0.3 }}>{activeModule}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
              {moduleOrders.length} total · {inProcessCount} in progress
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {bulkMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '5px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
                {selectedIds.size} selected
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBulkMove(true)}
                  style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Move Selected →
                </button>
              )}
              <button
                onClick={exitBulkMode}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#fff', color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, IDs, customers…"
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, width: 240, outline: 'none', fontFamily: 'inherit', background: '#F8FAFC', color: '#0F172A' }}
          />

          <button
            onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${bulkMode ? '#2563EB' : '#E2E8F0'}`,
              background: bulkMode ? '#EFF6FF' : '#F8FAFC',
              color: bulkMode ? '#2563EB' : '#64748B',
            }}
          >
            ☑ Bulk
          </button>

          <button
            onClick={() => setShowNewOrder(true)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + New Order
          </button>
        </div>

        {/* ── Kanban board ── */}
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 14, minWidth: 900 }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                col={col}
                orders={filteredOrders.filter((o) => o.status === col)}
                onMoveClick={setMoveTarget}
                onHistoryClick={setDetailOrder}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                bulkMode={bulkMode}
              />
            ))}
          </div>
        </div>
      </div>

      {detailOrder && (
        <DetailDrawer
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onMoveClick={(o) => { setMoveTarget(o); setDetailOrder(null); }}
        />
      )}

      {moveTarget && (
        <MoveModal
          order={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMove={handleMove}
        />
      )}

      {showBulkMove && (
        <BulkMoveModal
          count={selectedIds.size}
          onClose={() => setShowBulkMove(false)}
          onConfirm={handleBulkMove}
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
