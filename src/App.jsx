import { useState, useEffect } from 'react';
import { COLUMNS } from './constants';
import { generateId } from './utils';
import MoveModal from './components/MoveModal';
import HistoryModal from './components/HistoryModal';
import NewOrderModal from './components/NewOrderModal';
import { supabase } from './supabaseClient';

// ─── Palette — Light Mode ─────────────────────────────────────────────────────
const C = {
  appBg:        '#F4F6F9',
  sideBg:       '#FFFFFF',
  surfaceBase:  '#FFFFFF',
  surfaceRaise: '#F8F9FB',
  surfaceHover: '#F0F2F5',

  borderFaint:  '#E8EAED',
  borderLight:  '#D1D5DB',
  borderMed:    '#9CA3AF',

  accent:       '#2563EB',
  accentBg:     '#EFF6FF',
  accentHover:  '#1D4ED8',
  accentText:   '#1E40AF',

  txtPrimary:   '#111827',
  txtSecond:    '#4B5563',
  txtMuted:     '#9CA3AF',

  // Status colours
  blue:         '#2563EB',
  blueBg:       '#EFF6FF',
  blueText:     '#1E40AF',

  amber:        '#D97706',
  amberBg:      '#FFFBEB',
  amberText:    '#92400E',

  green:        '#059669',
  greenBg:      '#ECFDF5',
  greenText:    '#065F46',

  red:          '#DC2626',
  redBg:        '#FEF2F2',
  redText:      '#991B1B',

  // Sidebar active strip
  sideActive:   '#EFF6FF',
  sideActiveBorder: '#2563EB',
};

const FONT = "'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

const COL_ACCENT = {
  'New':        C.blue,
  'In Process': C.amber,
  'Completed':  C.green,
  'On Hold':    C.red,
};

const COL_BG = {
  'New':        C.blueBg,
  'In Process': C.amberBg,
  'Completed':  C.greenBg,
  'On Hold':    C.redBg,
};

const COL_TEXT = {
  'New':        C.blueText,
  'In Process': C.amberText,
  'Completed':  C.greenText,
  'On Hold':    C.redText,
};

const MODULES = ['Orders', 'Shipment', 'Installation', 'AIS140', 'Mining'];

function initials(name) {
  if (!name) return '--';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Inject global styles ─────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('tf-styles')) {
  const el = document.createElement('style');
  el.id = 'tf-styles';
  el.textContent = [
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');",
    "*, *::before, *::after { box-sizing: border-box; }",
    "body { background: #F4F6F9; }",
    "@keyframes tf-spin { to { transform: rotate(360deg); } }",
    ".tf-spin { width:18px; height:18px; border:2px solid #E5E7EB; border-top-color:#2563EB; border-radius:50%; animation:tf-spin 0.7s linear infinite; }",
    ".tf-card { transition: box-shadow 0.15s, border-color 0.15s; }",
    ".tf-card:hover { border-color: #D1D5DB !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }",
    ".tf-ibtn:hover { border-color: #9CA3AF !important; color: #374151 !important; background: #F3F4F6 !important; }",
    ".tf-nav:hover { background: #F3F4F6; }",
    ".tf-search:focus { outline:none; border-color:#2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }",
    ".tf-cta:hover { background: #1D4ED8 !important; }",
    ".tf-cta:active { transform: scale(0.97); }",
    "::-webkit-scrollbar { width:5px; height:5px; }",
    "::-webkit-scrollbar-track { background: #F3F4F6; }",
    "::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius:3px; }",
    "::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }",
  ].join('\n');
  document.head.appendChild(el);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IcoSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
      style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.txtMuted, pointerEvents:'none' }}>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IcoPlus() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IcoMove() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcoClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, onMoveClick, onHistoryClick }) {
  return (
    <div className="tf-card" style={{
      background: C.surfaceBase,
      border: '1px solid ' + C.borderFaint,
      borderRadius: 10,
      padding: '12px 14px 11px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontFamily: FONT,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div>
        <div style={{ fontSize:11, fontFamily:MONO, color:C.txtMuted, marginBottom:4, letterSpacing:'0.04em' }}>{order.id}</div>
        <div style={{ fontSize:13, fontWeight:500, color:C.txtPrimary, lineHeight:1.4, letterSpacing:'-0.01em' }}>{order.title}</div>
        <div style={{ fontSize:12, color:C.txtSecond, marginTop:3 }}>{order.customer}</div>
      </div>

      <div style={{ height:1, background:C.borderFaint }} />

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{
            width:22, height:22, borderRadius:'50%',
            background: C.accentBg,
            border: '1.5px solid ' + C.accent + '33',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, fontWeight:600, color:C.accent, flexShrink:0,
          }}>{initials(order.assignee)}</div>
          <span style={{ fontSize:11, color:C.txtMuted }}>{order.assignee || 'Unassigned'}</span>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button className="tf-ibtn" onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
            style={{ background:'transparent', border:'1px solid '+C.borderFaint, borderRadius:5, color:C.txtMuted, cursor:'pointer', padding:'3px 9px', fontSize:11, fontFamily:FONT, display:'flex', alignItems:'center', gap:4, transition:'all 0.15s' }}>
            <IcoMove /> Move
          </button>
          <button className="tf-ibtn" onClick={(e) => { e.stopPropagation(); onHistoryClick(order); }}
            style={{ background:'transparent', border:'1px solid '+C.borderFaint, borderRadius:5, color:C.txtMuted, cursor:'pointer', padding:'3px 8px', fontSize:11, display:'flex', alignItems:'center', transition:'all 0.15s' }}>
            <IcoClock />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, orders, onMoveClick, onHistoryClick }) {
  const accent  = COL_ACCENT[col] || C.accent;
  const bgChip  = COL_BG[col]     || C.accentBg;
  const txtChip = COL_TEXT[col]   || C.accentText;

  return (
    <div style={{
      flex:'1 1 0', minWidth:215,
      background: C.appBg,
      border: '1px solid ' + C.borderFaint,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 112px)',
      overflow: 'hidden',
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ padding:'12px 14px 11px', background:C.surfaceBase, borderBottom:'1px solid '+C.borderFaint, display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:3, height:16, borderRadius:2, background:accent, flexShrink:0 }} />
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:C.txtSecond, flex:1 }}>{col}</span>
        <span style={{ fontSize:11, fontFamily:MONO, fontWeight:500, color:txtChip, background:bgChip, borderRadius:20, padding:'2px 9px' }}>{orders.length}</span>
      </div>

      {/* Cards */}
      <div style={{ padding:'10px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        {orders.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 16px', gap:6, opacity:0.4 }}>
            <div style={{ width:22, height:2, borderRadius:1, background:C.borderLight }} />
            <div style={{ width:15, height:2, borderRadius:1, background:C.borderLight }} />
            <span style={{ fontSize:11, color:C.txtMuted, marginTop:6 }}>No orders</span>
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
    <aside style={{
      width:224, flexShrink:0,
      background: C.sideBg,
      borderRight: '1px solid ' + C.borderFaint,
      display:'flex', flexDirection:'column',
      height:'100vh', position:'sticky', top:0,
      fontFamily: FONT,
    }}>
      {/* Brand */}
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid '+C.borderFaint }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8,
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6"/>
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6"/>
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:C.txtPrimary, letterSpacing:'-0.02em' }}>TrackFlow</div>
            <div style={{ fontSize:11, color:C.txtMuted, marginTop:1 }}>Order Management</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding:'14px 10px', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:C.txtMuted, fontWeight:600, padding:'0 10px', marginBottom:6 }}>Modules</div>
        {MODULES.map((m) => {
          const active = activeModule === m;
          return (
            <div key={m} className={active ? '' : 'tf-nav'} onClick={() => onSelect(m)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'9px 10px',
              borderRadius:7, cursor:'pointer', marginBottom:2,
              background: active ? C.sideActive : 'transparent',
              borderLeft: active ? '2.5px solid '+C.sideActiveBorder : '2.5px solid transparent',
              color: active ? C.accent : C.txtSecond,
              fontWeight: active ? 500 : 400, fontSize:13,
              transition:'background 0.15s, color 0.15s',
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background: active ? C.accent : C.borderLight, flexShrink:0, transition:'background 0.15s' }} />
              <span style={{ flex:1 }}>{m}</span>
              <span style={{
                fontSize:11, fontFamily:MONO,
                color: active ? C.accentText : C.txtMuted,
                background: active ? '#DBEAFE' : C.surfaceRaise,
                border: '1px solid ' + (active ? '#BFDBFE' : C.borderFaint),
                borderRadius:4, padding:'1px 7px', fontWeight:500,
              }}>{counts[m] || 0}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 18px', borderTop:'1px solid '+C.borderFaint, display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', flexShrink:0, boxShadow:'0 0 0 2px #D1FAE5' }} />
        <span style={{ fontSize:11, color:C.txtMuted }}>Connected to Supabase</span>
      </div>
    </aside>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, dotColor, bgColor }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', background:bgColor || C.surfaceRaise, border:'1px solid '+C.borderFaint, borderRadius:20, fontFamily:FONT }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
      <span style={{ fontSize:12, color:C.txtSecond }}>{label}</span>
      <span style={{ fontSize:12, fontFamily:MONO, fontWeight:600, color:C.txtPrimary }}>{value}</span>
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
          <div className="tf-spin" /> Loading orders…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.appBg, fontFamily:FONT }}>
        <div style={{ background:C.surfaceBase, border:'1px solid #FECACA', borderRadius:12, padding:'28px 36px', maxWidth:400, textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
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
        <div style={{
          background: C.surfaceBase,
          borderBottom: '1px solid ' + C.borderFaint,
          padding: '13px 24px',
          display: 'flex', alignItems: 'center', gap:14, flexShrink:0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:C.txtPrimary, letterSpacing:'-0.02em' }}>{activeModule}</div>
            <div style={{ fontSize:12, color:C.txtMuted, fontFamily:MONO, marginTop:1 }}>{moduleTotal} orders total</div>
          </div>

          <div style={{ display:'flex', gap:8, marginLeft:8 }}>
            <StatPill label="In Progress" value={inProcessCount} dotColor={C.amber} bgColor={C.amberBg} />
            <StatPill label="Completed"   value={completedCount}  dotColor={C.green} bgColor={C.greenBg} />
          </div>

          <div style={{ flex:1 }} />

          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <IcoSearch />
            <input
              className="tf-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders, IDs, customers..."
              style={{
                padding:'8px 13px 8px 35px',
                borderRadius: 7,
                border: '1.5px solid ' + C.borderFaint,
                background: C.surfaceRaise,
                color: C.txtPrimary,
                fontSize: 13,
                width: 250,
                fontFamily: FONT,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          <button className="tf-cta" onClick={() => setShowNewOrder(true)} style={{
            padding:'9px 18px', borderRadius:7, border:'none',
            background: C.accent, color:'#FFFFFF',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT,
            display:'flex', alignItems:'center', gap:6,
            transition:'background 0.15s', whiteSpace:'nowrap',
            boxShadow: '0 1px 4px rgba(37,99,235,0.3)',
          }}>
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
