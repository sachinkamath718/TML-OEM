import { useState, useEffect } from 'react';
import { COLUMNS } from './constants';
import { generateId } from './utils';
import MoveModal from './components/MoveModal';
import HistoryModal from './components/HistoryModal';
import NewOrderModal from './components/NewOrderModal';
import { supabase } from './supabaseClient';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  appBg:        '#0D1117',
  sideBg:       '#161B22',
  surfaceBase:  '#1C2330',
  surfaceRaise: '#222C3A',
  surfaceHover: '#263040',
  borderFaint:  'rgba(255,255,255,0.06)',
  borderLight:  'rgba(255,255,255,0.10)',
  borderMed:    'rgba(255,255,255,0.18)',
  accent:       '#00C9A7',
  accentBg:     'rgba(0,201,167,0.12)',
  accentHover:  '#00A888',
  txtPrimary:   '#E6EDF3',
  txtSecond:    '#8B949E',
  txtMuted:     '#58636D',
  blue:         '#58A6FF',
  amber:        '#E3B341',
  green:        '#00C9A7',
  red:          '#F85149',
};

const FONT = "'DM Sans', system-ui, sans-serif";
const MONO = "'DM Mono', 'Courier New', monospace";

const COL_ACCENT = {
  'New':        '#58A6FF',
  'In Process': '#E3B341',
  'Completed':  '#00C9A7',
  'On Hold':    '#F85149',
};

const MODULES = ['Orders', 'Shipment', 'Installation', 'AIS140', 'Mining'];

function initials(name) {
  if (!name) return '--';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Inject global styles once ────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('tf-styles')) {
  const el = document.createElement('style');
  el.id = 'tf-styles';
  el.textContent = [
    "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');",
    "*, *::before, *::after { box-sizing: border-box; }",
    "@keyframes tf-spin { to { transform: rotate(360deg); } }",
    ".tf-spin { width:18px; height:18px; border:2px solid rgba(255,255,255,0.1); border-top-color:#00C9A7; border-radius:50%; animation:tf-spin 0.7s linear infinite; }",
    ".tf-card:hover { border-color: rgba(255,255,255,0.10) !important; background: #263040 !important; }",
    ".tf-ibtn:hover { border-color: rgba(255,255,255,0.18) !important; color: #E6EDF3 !important; background: #263040 !important; }",
    ".tf-nav:hover { background: rgba(0,201,167,0.12); color: #E6EDF3; }",
    ".tf-search:focus { outline:none; border-color:#00C9A7 !important; }",
    ".tf-cta:hover { background: #00A888 !important; }",
    ".tf-cta:active { transform: scale(0.97); }",
    "::-webkit-scrollbar { width:5px; height:5px; }",
    "::-webkit-scrollbar-track { background:transparent; }",
    "::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }",
  ].join('\n');
  document.head.appendChild(el);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IcoSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.txtMuted, pointerEvents:'none' }}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IcoPlus() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IcoMove() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcoClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, onMoveClick, onHistoryClick }) {
  return (
    <div className="tf-card" style={{
      background: C.surfaceRaise,
      border: '1px solid ' + C.borderFaint,
      borderRadius: 10,
      padding: '11px 12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      transition: 'border-color 0.15s, background 0.15s',
      fontFamily: FONT,
    }}>
      <div>
        <div style={{ fontSize:11, fontFamily:MONO, color:C.txtMuted, marginBottom:3 }}>{order.id}</div>
        <div style={{ fontSize:13, fontWeight:500, color:C.txtPrimary, lineHeight:1.35, letterSpacing:'-0.01em' }}>{order.title}</div>
        <div style={{ fontSize:12, color:C.txtSecond, marginTop:3 }}>{order.customer}</div>
      </div>
      <div style={{ height:1, background:C.borderFaint }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{
            width:20, height:20, borderRadius:'50%',
            background:C.accentBg, border:'1px solid rgba(0,201,167,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, fontWeight:600, color:C.accent, flexShrink:0, fontFamily:FONT,
          }}>{initials(order.assignee)}</div>
          <span style={{ fontSize:11, color:C.txtMuted }}>{order.assignee || 'Unassigned'}</span>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button className="tf-ibtn" onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
            style={{ background:'transparent', border:'1px solid '+C.borderFaint, borderRadius:4, color:C.txtMuted, cursor:'pointer', padding:'3px 8px', fontSize:11, fontFamily:FONT, display:'flex', alignItems:'center', gap:4, transition:'all 0.15s' }}>
            <IcoMove /> Move
          </button>
          <button className="tf-ibtn" onClick={(e) => { e.stopPropagation(); onHistoryClick(order); }}
            style={{ background:'transparent', border:'1px solid '+C.borderFaint, borderRadius:4, color:C.txtMuted, cursor:'pointer', padding:'3px 7px', fontSize:11, fontFamily:FONT, display:'flex', alignItems:'center', transition:'all 0.15s' }}>
            <IcoClock />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, orders, onMoveClick, onHistoryClick }) {
  const accent = COL_ACCENT[col] || C.accent;
  return (
    <div style={{
      flex:'1 1 0', minWidth:210,
      background: C.surfaceBase,
      border: '1px solid ' + C.borderFaint,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 108px)',
      overflow: 'hidden',
      fontFamily: FONT,
    }}>
      <div style={{ padding:'11px 13px 10px', borderBottom:'1px solid '+C.borderFaint, display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:3, height:16, borderRadius:2, background:accent, flexShrink:0 }} />
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:C.txtSecond, flex:1 }}>{col}</span>
        <span style={{ fontSize:11, fontFamily:MONO, color:C.txtMuted, background:C.surfaceRaise, border:'1px solid '+C.borderFaint, borderRadius:4, padding:'1px 7px', fontWeight:500 }}>{orders.length}</span>
      </div>
      <div style={{ padding:10, overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        {orders.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'36px 16px', gap:6, opacity:0.3 }}>
            <div style={{ width:20, height:2, borderRadius:1, background:C.txtMuted }} />
            <div style={{ width:14, height:2, borderRadius:1, background:C.txtMuted }} />
            <span style={{ fontSize:11, color:C.txtMuted, marginTop:4 }}>No orders</span>
          </div>
        ) : (
          orders.map((o) => <OrderCard key={o.id} order={o} onMoveClick={onMoveClick} onHistoryClick={onHistoryClick} />)
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeModule, onSelect, orders }) {
  const counts = MODULES.reduce((acc, m) => { acc[m] = orders.filter((o) => o.module === m).length; return acc; }, {});
  return (
    <aside style={{ width:220, flexShrink:0, background:C.sideBg, borderRight:'1px solid '+C.borderFaint, display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, fontFamily:FONT }}>
      <div style={{ padding:'18px 18px 14px', borderBottom:'1px solid '+C.borderFaint }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:6, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:C.appBg }} />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:C.txtPrimary, letterSpacing:'-0.02em' }}>TrackFlow</div>
            <div style={{ fontSize:10, color:C.txtMuted, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:1 }}>Operations</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'12px 10px', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:C.txtMuted, fontWeight:500, padding:'0 8px', marginBottom:6 }}>Modules</div>
        {MODULES.map((m) => {
          const active = activeModule === m;
          return (
            <div key={m} className={active ? '' : 'tf-nav'} onClick={() => onSelect(m)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:6, cursor:'pointer', marginBottom:2,
              background: active ? C.accentBg : 'transparent',
              borderLeft: active ? '2px solid '+C.accent : '2px solid transparent',
              color: active ? C.accent : C.txtSecond,
              fontWeight: active ? 500 : 400, fontSize:13,
              transition:'background 0.15s, color 0.15s',
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background: active ? C.accent : C.txtMuted, flexShrink:0 }} />
              <span style={{ flex:1 }}>{m}</span>
              <span style={{ fontSize:11, fontFamily:MONO, color:C.txtMuted, background:C.surfaceRaise, border:'1px solid '+C.borderFaint, borderRadius:4, padding:'1px 6px' }}>{counts[m] || 0}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding:'10px 16px', borderTop:'1px solid '+C.borderFaint, display:'flex', alignItems:'center', gap:7, fontSize:11, color:C.txtMuted }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:C.accent, flexShrink:0 }} />
        Connected
      </div>
    </aside>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, dotColor }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:C.surfaceBase, border:'1px solid '+C.borderFaint, borderRadius:6, fontFamily:FONT }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
      <span style={{ fontSize:12, color:C.txtMuted }}>{label}</span>
      <span style={{ fontSize:12, fontFamily:MONO, fontWeight:500, color:C.txtSecond }}>{value}</span>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
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

  useEffect(() => {
    const channel = supabase.channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') setOrders((prev) => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE') setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));
        else if (payload.eventType === 'DELETE') setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const filteredOrders = orders
    .filter((o) => o.module === activeModule)
    .filter((o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
    );

  const moduleTotal    = orders.filter((o) => o.module === activeModule).length;
  const inProcessCount = filteredOrders.filter((o) => o.status === 'In Process').length;
  const completedCount = filteredOrders.filter((o) => o.status === 'Completed').length;

  async function handleMove({ targetCol, user, note }) {
    const order = orders.find((o) => o.id === moveTarget.id);
    if (!order) return;
    const newEntry = { id: 'h-' + generateId(), action: 'Status Changed', from: order.status, to: targetCol, timestamp: new Date().toISOString(), user, note };
    const updatedHistory = [...(order.history || []), newEntry];
    try {
      const { error } = await supabase.from('orders').update({ status: targetCol, assignee: user.name, history: updatedHistory }).eq('id', order.id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => o.id !== moveTarget.id ? o : { ...o, status: targetCol, assignee: user.name, history: updatedHistory }));
      if (historyTarget?.id === moveTarget.id) setHistoryTarget((prev) => ({ ...prev, status: targetCol, assignee: user.name, history: updatedHistory }));
    } catch (err) {
      alert('Failed to update order. Please try again.');
    }
    setMoveTarget(null);
  }

  async function handleCreate(newOrders) {
    try {
      const { data, error } = await supabase.from('orders').insert(newOrders).select();
      if (error) throw error;
      setOrders((prev) => [...(data || newOrders), ...prev]);
      setShowNewOrder(false);
    } catch (err) {
      alert('Failed to create order. Please try again.');
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.appBg, fontFamily:FONT }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, color:C.txtSecond, fontSize:14 }}>
          <div className="tf-spin" /> Loading orders
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.appBg, fontFamily:FONT }}>
        <div style={{ background:C.surfaceBase, border:'1px solid rgba(248,81,73,0.3)', borderRadius:12, padding:'28px 36px', maxWidth:400, textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:600, color:C.red, marginBottom:8 }}>Connection Error</div>
          <div style={{ fontSize:13, color:C.txtSecond, lineHeight:1.6 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:FONT, minHeight:'100vh', background:C.appBg, display:'flex', color:C.txtPrimary, WebkitFontSmoothing:'antialiased' }}>
      <Sidebar activeModule={activeModule} onSelect={setActiveModule} orders={orders} />

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        {/* Topbar */}
        <div style={{ background:C.sideBg, borderBottom:'1px solid '+C.borderFaint, padding:'12px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:C.txtPrimary, letterSpacing:'-0.01em' }}>{activeModule}</div>
            <div style={{ fontSize:12, color:C.txtMuted, fontFamily:MONO, marginTop:1 }}>{moduleTotal} total</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <StatPill label="In Progress" value={inProcessCount} dotColor={C.amber} />
            <StatPill label="Completed"   value={completedCount}  dotColor={C.green} />
          </div>
          <div style={{ flex:1 }} />
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <IcoSearch />
            <input
              className="tf-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders, IDs, customers..."
              style={{ padding:'7px 12px 7px 34px', borderRadius:6, border:'1px solid '+C.borderLight, background:C.surfaceBase, color:C.txtPrimary, fontSize:13, width:240, fontFamily:FONT, transition:'border-color 0.15s' }}
            />
          </div>
          <button className="tf-cta" onClick={() => setShowNewOrder(true)}
            style={{ padding:'8px 16px', borderRadius:6, border:'none', background:C.accent, color:C.appBg, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT, display:'flex', alignItems:'center', gap:6, transition:'background 0.15s', whiteSpace:'nowrap' }}>
            <IcoPlus /> New Order
          </button>
        </div>

        {/* Board */}
        <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'20px 24px' }}>
          <div style={{ display:'flex', gap:14, minWidth:960, height:'100%', alignItems:'flex-start' }}>
            {COLUMNS.map((col) => (
              <KanbanColumn key={col} col={col} orders={filteredOrders.filter((o) => o.status === col)} onMoveClick={setMoveTarget} onHistoryClick={setHistoryTarget} />
            ))}
          </div>
        </div>
      </div>

      {moveTarget    && <MoveModal    order={moveTarget}    onClose={() => setMoveTarget(null)}    onMove={handleMove} />}
      {historyTarget && <HistoryModal order={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {showNewOrder  && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />}
    </div>
  );
}
