import { MODULES, MODULE_ICONS } from '../constants';

export default function Sidebar({ activeModule, onSelect, totalOrders }) {
  return (
    <div
      style={{
        width: 220,
        background: '#1E1B4B',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#A5B4FC', letterSpacing: 2, textTransform: 'uppercase' }}>
          OEM Tracker
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
          Order Management System
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px', flex: 1 }}>
        {MODULES.map((m) => (
          <button
            key={m}
            onClick={() => onSelect(m)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeModule === m ? 'rgba(165,180,252,0.15)' : 'transparent',
              color: activeModule === m ? '#A5B4FC' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeModule === m ? 600 : 400,
              marginBottom: 2,
              textAlign: 'left',
              borderLeft: activeModule === m ? '2px solid #6366F1' : '2px solid transparent',
              transition: 'all 0.12s',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <span style={{ fontSize: 16 }}>{MODULE_ICONS[m]}</span>
            {m}
          </button>
        ))}
      </nav>

      {/* Footer stat */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Total Orders</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#E0E7FF' }}>{totalOrders}</div>
      </div>
    </div>
  );
}
