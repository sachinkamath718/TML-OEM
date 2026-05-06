const MODULES = [
  { name: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { name: 'Shipment', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { name: 'Delivery', icon: 'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m-1 11h-6a2 2 0 01-2-2v-6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2z' },
  { name: 'Installation', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { name: 'AIS140', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { name: 'Mining', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
];

export default function Sidebar({ activeModule, onSelect, totalOrders }) {
  return (
    <div style={{ width: 220, background: '#0A1628', borderRight: 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '2px 0 8px rgba(0,0,0,0.18)' }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', letterSpacing: -0.2 }}>OEM Tracker</div>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 0.5 }}>TML SYSTEM</div>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: 1.2 }}>MODULES</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {MODULES.map(({ name, icon }) => {
          const active = activeModule === name;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(37,99,235,0.25)' : 'transparent',
                color: active ? '#93C5FD' : '#64748B',
                fontSize: 13, fontWeight: active ? 600 : 400,
                marginBottom: 2, textAlign: 'left',
                transition: 'all 0.15s ease',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              {name}
              {active && (
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, color: '#475569' }}>Active orders</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{totalOrders}</div>
      </div>
    </div>
  );
}
