import { useState, useEffect } from 'react';
import { COLUMNS } from './constants';
import { generateId } from './utils';

import MoveModal from './components/MoveModal';
import HistoryModal from './components/HistoryModal';
import NewOrderModal from './components/NewOrderModal';

import { supabase } from './supabaseClient';

// ─── Design tokens ────────────────────────────────────────────────────────────
const tokens = {
  // Core palette: Deep slate + teal accent + warm surface
  colors: {
    // Backgrounds
    appBg:        '#0D1117',   // near-black base
    sideBg:       '#161B22',   // sidebar surface
    surfacePrimary:   '#1C2330',   // card/panel bg
    surfaceSecondary: '#222C3A',   // elevated surface
    surfaceHover:     '#263040',   // hover state

    // Borders
    borderSubtle:  'rgba(255,255,255,0.06)',
    borderDefault: 'rgba(255,255,255,0.10)',
    borderStrong:  'rgba(255,255,255,0.18)',

    // Accent — teal
    accentPrimary:  '#00C9A7',   // main CTA
    accentMuted:    'rgba(0,201,167,0.12)',
    accentStrong:   '#00A888',

    // Text
    textPrimary:   '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted:     '#58636D',

    // Status chips
    statusNew:      { bg: 'rgba(56,139,253,0.12)',  text: '#58A6FF' },
    statusProcess:  { bg: 'rgba(210,153,34,0.12)',  text: '#E3B341' },
    statusComplete: { bg: 'rgba(0,201,167,0.12)',   text: '#00C9A7' },
    statusHold:     { bg: 'rgba(248,81,73,0.12)',   text: '#F85149' },
  },

  // Typography: DM Sans + DM Mono
  fontDisplay: "'DM Sans', system-ui, sans-serif",
  fontMono:    "'DM Mono', monospace",

  radii: {
    sm: '4px',
    md: '6px',
    lg: '10px',
    xl: '14px',
  },

  shadow: {
    card:  '0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
    modal: '0 8px 32px rgba(0,0,0,0.6)',
  },
};

// ─── Inject Google Fonts once ─────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('app-fonts')) {
  const link = document.createElement('link');
  link.id = 'app-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap';
  document.head.appendChild(link);
}

// ─── Inline styles ────────────────────────────────────────────────────────────
const s = {
  root: {
    fontFamily: tokens.fontDisplay,
    minHeight: '100vh',
    background: tokens.colors.appBg,
    display: 'flex',
    color: tokens.colors.textPrimary,
    WebkitFontSmoothing: 'antialiased',
  },

  // ── Sidebar ──
  sidebar: {
    width: 224,
    flexShrink: 0,
    background: tokens.colors.sideBg,
    borderRight: `1px solid ${tokens.colors.borderSubtle}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    overflow: 'hidden',
  },

  sidebarBrand: {
    padding: '20px 20px 16px',
    borderBottom: `1px solid ${tokens.colors.borderSubtle}`,
  },

  brandMark: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: tokens.radii.md,
    background: tokens.colors.accentPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  brandIconDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: tokens.colors.appBg,
  },

  brandName: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: tokens.colors.textPrimary,
  },

  brandSub: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    fontWeight: 400,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  navSection: {
    padding: '12px 12px',
    flex: 1,
    overflowY: 'auto',
  },

  navLabel: {
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: tokens.colors.textMuted,
    fontWeight: 500,
    padding: '0 8px',
    marginBottom: 6,
    marginTop: 4,
  },

  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: tokens.radii.md,
    cursor: 'pointer',
    marginBottom: 2,
    transition: 'background 0.15s, color 0.15s',
    background: active ? tokens.colors.accentMuted : 'transparent',
    borderLeft: active
      ? `2px solid ${tokens.colors.accentPrimary}`
      : '2px solid transparent',
    color: active ? tokens.colors.accentPrimary : tokens.colors.textSecondary,
    fontWeight: active ? 500 : 400,
    fontSize: 13,
  }),

  navDot: (active) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: active ? tokens.colors.accentPrimary : tokens.colors.textMuted,
    flexShrink: 0,
    marginLeft: 2,
  }),

  navCount: {
    marginLeft: 'auto',
    fontSize: 11,
    fontFamily: tokens.fontMono,
    color: tokens.colors.textMuted,
    background: tokens.colors.surfaceSecondary,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: 4,
    padding: '1px 6px',
  },

  // ── Main area ──
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },

  topbar: {
    background: tokens.colors.sideBg,
    borderBottom: `1px solid ${tokens.colors.borderSubtle}`,
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },

  topbarTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: tokens.colors.textPrimary,
    letterSpacing: '-0.01em',
  },

  topbarMeta: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontFamily: tokens.fontMono,
    marginTop: 2,
  },

  badge: (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: tokens.fontMono,
    background: tokens.colors[type]?.bg || tokens.colors.statusNew.bg,
    color: tokens.colors[type]?.text || tokens.colors.statusNew.text,
  }),

  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  searchInput: {
    padding: '7px 12px 7px 36px',
    borderRadius: tokens.radii.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
    background: tokens.colors.surfacePrimary,
    color: tokens.colors.textPrimary,
    fontSize: 13,
    width: 240,
    outline: 'none',
    fontFamily: tokens.fontDisplay,
    transition: 'border-color 0.15s, background 0.15s',
  },

  searchIcon: {
    position: 'absolute',
    left: 11,
    width: 14,
    height: 14,
    color: tokens.colors.textMuted,
    pointerEvents: 'none',
  },

  btnPrimary: {
    padding: '8px 16px',
    borderRadius: tokens.radii.md,
    border: 'none',
    background: tokens.colors.accentPrimary,
    color: '#0D1117',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: tokens.fontDisplay,
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s, transform 0.1s',
    whiteSpace: 'nowrap',
  },

  // ── Board ──
  boardScroll: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'auto',
    padding: '20px 24px',
  },

  boardInner: {
    display: 'flex',
    gap: 14,
    minWidth: 960,
    alignItems: 'flex-start',
  },

  // ── Column ──
  column: {
    flex: '1 1 0',
    minWidth: 210,
    background: tokens.colors.surfacePrimary,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radii.xl,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 110px)',
  },

  columnHeader: (statusColor) => ({
    padding: '12px 14px 10px',
    borderBottom: `1px solid ${tokens.colors.borderSubtle}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  }),

  columnAccent: (color) => ({
    width: 3,
    height: 16,
    borderRadius: 2,
    background: color,
    flexShrink: 0,
  }),

  columnTitle: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: tokens.colors.textSecondary,
    flex: 1,
  },

  columnCount: {
    fontSize: 11,
    fontFamily: tokens.fontMono,
    color: tokens.colors.textMuted,
    background: tokens.colors.surfaceSecondary,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: 4,
    padding: '1px 7px',
    fontWeight: 500,
  },

  columnBody: {
    padding: '10px 10px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  // ── Order card ──
  card: {
    background: tokens.colors.surfaceSecondary,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radii.lg,
    padding: '12px 12px 10px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  cardId: {
    fontSize: 11,
    fontFamily: tokens.fontMono,
    color: tokens.colors.textMuted,
    fontWeight: 500,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: tokens.colors.textPrimary,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
  },

  cardCustomer: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },

  cardDivider: {
    height: 1,
    background: tokens.colors.borderSubtle,
  },

  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  cardAssignee: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  assigneeAvatar: (initials) => ({
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: tokens.colors.accentMuted,
    border: `1px solid rgba(0,201,167,0.25)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 600,
    color: tokens.colors.accentPrimary,
    letterSpacing: '0.02em',
    flexShrink: 0,
    fontFamily: tokens.fontDisplay,
  }),

  assigneeName: {
    fontSize: 11,
    color: tokens.colors.textMuted,
  },

  iconBtn: {
    background: 'transparent',
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radii.sm,
    color: tokens.colors.textMuted,
    cursor: 'pointer',
    padding: '3px 7px',
    fontSize: 11,
    fontFamily: tokens.fontDisplay,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
  },

  // ── States ──
  emptyCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    gap: 8,
    opacity: 0.4,
  },

  emptyLine: {
    width: 24,
    height: 2,
    borderRadius: 2,
    background: tokens.colors.textMuted,
  },

  screenCenter: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.colors.appBg,
    fontFamily: tokens.fontDisplay,
  },

  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: tokens.colors.textSecondary,
    fontSize: 14,
  },

  spinner: {
    width: 16,
    height: 16,
    border: `2px solid ${tokens.colors.borderDefault}`,
    borderTop: `2px solid ${tokens.colors.accentPrimary}`,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  errorCard: {
    background: tokens.colors.surfacePrimary,
    border: `1px solid rgba(248,81,73,0.3)`,
    borderRadius: tokens.radii.xl,
    padding: '28px 36px',
    color: '#F85149',
    fontSize: 13,
    maxWidth: 400,
    textAlign: 'center',
    boxShadow: tokens.shadow.card,
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 8,
  },
};

// ─── Column color map ──────────────────────────────────────────────────────────
const COL_COLORS = {
  'New':        '#378ADD',
  'In Process': '#E3B341',
  'Completed':  '#00C9A7',
  'On Hold':    '#F85149',
};

// ─── Module list ───────────────────────────────────────────────────────────────
const MODULES = [
  'Orders', 'Shipment', 'Installation', 'AIS140', 'Mining',
];

// ─── Helper: initials ──────────────────────────────────────────────────────────
function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Mini SVG icons ────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={s.searchIcon}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMove() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onMoveClick, onHistoryClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...s.card,
        borderColor: hovered ? tokens.colors.borderDefault : tokens.colors.borderSubtle,
        background: hovered ? tokens.colors.surfaceHover : tokens.colors.surfaceSecondary,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.cardTop}>
        <div>
          <div style={s.cardId}>{order.id}</div>
          <div style={s.cardTitle}>{order.title}</div>
          <div style={s.cardCustomer}>{order.customer}</div>
        </div>
      </div>

      <div style={s.cardDivider} />

      <div style={s.cardFooter}>
        <div style={s.cardAssignee}>
          <div style={s.assigneeAvatar()}>
            {initials(order.assignee)}
          </div>
          <span style={s.assigneeName}>{order.assignee || 'Unassigned'}</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={s.iconBtn}
            onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
            title="Move"
          >
            <IconMove /> Move
          </button>
          <button
            style={s.iconBtn}
            onClick={(e) => { e.stopPropagation(); onHistoryClick(order); }}
            title="History"
          >
            <IconHistory />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumnLocal({ col, orders, onMoveClick, onHistoryClick }) {
  const accent = COL_COLORS[col] || tokens.colors.accentPrimary;
  return (
    <div style={s.column}>
      <div style={s.columnHeader()}>
        <div style={s.columnAccent(accent)} />
        <span style={s.columnTitle}>{col}</span>
        <span style={s.columnCount}>{orders.length}</span>
      </div>

      <div style={s.columnBody}>
        {orders.length === 0 ? (
          <div style={s.emptyCol}>
            <div style={s.emptyLine} />
            <div style={s.emptyLine} />
            <div style={{ fontSize: 11, color: tokens.colors.textMuted }}>No orders</div>
          </div>
        ) : (
          orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onMoveClick={onMoveClick}
              onHistoryClick={onHistoryClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function SidebarLocal({ activeModule, onSelect, orders }) {
  const moduleCounts = MODULES.reduce((acc, m) => {
    acc[m] = orders.filter((o) => o.module === m).length;
    return acc;
  }, {});

  return (
    <aside style={s.sidebar}>
      <div style={s.sidebarBrand}>
        <div style={s.brandMark}>
          <div style={s.brandIcon}>
            <div style={s.brandIconDot} />
          </div>
          <div>
            <div style={s.brandName}>TrackFlow</div>
            <div style={s.brandSub}>Operations</div>
          </div>
        </div>
      </div>

      <div style={s.navSection}>
        <div style={s.navLabel}>Modules</div>
        {MODULES.map((m) => (
          <div
            key={m}
            style={s.navItem(activeModule === m)}
            onClick={() => onSelect(m)}
          >
            <div style={s.navDot(activeModule === m)} />
            <span style={{ flex: 1 }}>{m}</span>
            <span style={s.navCount}>{moduleCounts[m] ?? 0}</span>
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${tokens.colors.borderSubtle}`,
        fontSize: 11,
        color: tokens.colors.textMuted,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#00C9A7',
          flexShrink: 0,
        }} />
        Connected to Supabase
      </div>
    </aside>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      background: tokens.colors.surfacePrimary,
      border: `1px solid ${tokens.colors.borderSubtle}`,
      borderRadius: tokens.radii.md,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: tokens.colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: tokens.fontMono, fontWeight: 500, color: tokens.colors.textSecondary }}>{value}</span>
    </div>
  );
}

// ─── Spin keyframes injection ──────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('app-keyframes')) {
  const style = document.createElement('style');
  style.id = 'app-keyframes';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    input:focus { outline: none; border-color: #00C9A7 !important; background: #1C2330 !important; }
    button:hover { opacity: 0.88; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
  `;
  document.head.appendChild(style);
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeModule, setActiveModule] = useState('Orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [search, setSearch] = useState('');

  // ─── Fetch orders ──────────────────────────────────────────────────────────
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

  // ─── Real-time ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));
        } else if (payload.eventType === 'DELETE') {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filteredOrders = orders
    .filter((o) => o.module === activeModule)
    .filter((o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
    );

  const moduleTotal     = orders.filter((o) => o.module === activeModule).length;
  const inProcessCount  = filteredOrders.filter((o) => o.status === 'In Process').length;
  const completedCount  = filteredOrders.filter((o) => o.status === 'Completed').length;

  // ─── Move ──────────────────────────────────────────────────────────────────
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
        .update({ status: targetCol, assignee: user.name, history: updatedHistory })
        .eq('id', order.id);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id !== moveTarget.id
            ? o
            : { ...o, status: targetCol, assignee: user.name, history: updatedHistory }
        )
      );
      if (historyTarget?.id === moveTarget.id) {
        setHistoryTarget((prev) => ({ ...prev, status: targetCol, assignee: user.name, history: updatedHistory }));
      }

      if ((activeModule === 'Shipment' || activeModule === 'Installation') && targetCol === 'Completed') {
        console.log(`Webhook: ${activeModule} Completed for ${order.id}`);
      }
      if ((activeModule === 'AIS140' || activeModule === 'Mining') &&
          (targetCol === 'In Process' || targetCol === 'Completed')) {
        console.log(`Webhook: ${activeModule} → ${targetCol} for ${order.id}`);
      }
    } catch (err) {
      alert('Failed to update order status. Please try again.');
    }
    setMoveTarget(null);
  }

  // ─── Create ────────────────────────────────────────────────────────────────
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

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.screenCenter}>
        <div style={s.loadingText}>
          <div style={s.spinner} />
          Loading orders
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={s.screenCenter}>
        <div style={s.errorCard}>
          <div style={s.errorTitle}>Connection Error</div>
          <div style={{ color: tokens.colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{error}</div>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <SidebarLocal
        activeModule={activeModule}
        onSelect={setActiveModule}
        orders={orders}
      />

      <div style={s.main}>
        {/* Top bar */}
        <div style={s.topbar}>
          <div>
            <div style={s.topbarTitle}>{activeModule}</div>
            <div style={s.topbarMeta}>{moduleTotal} total orders</div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatPill label="In Progress" value={inProcessCount} color={COL_COLORS['In Process']} />
            <StatPill label="Completed"   value={completedCount}  color={COL_COLORS['Completed']} />
          </div>

          <div style={{ flex: 1 }} />

          <div style={s.searchWrapper}>
            <IconSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders, IDs, customers..."
              style={s.searchInput}
            />
          </div>

          <button
            onClick={() => setShowNewOrder(true)}
            style={s.btnPrimary}
          >
            <IconPlus /> New Order
          </button>
        </div>

        {/* Board */}
        <div style={s.boardScroll}>
          <div style={s.boardInner}>
            {COLUMNS.map((col) => (
              <KanbanColumnLocal
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
