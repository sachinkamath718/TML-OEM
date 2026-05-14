import { useState } from 'react';
import { formatDate } from '../utils';

export default function TicketCard({ order, module, onMoveClick, onHistoryClick, selected, onSelect, bulkMode }) {
  // Use order._module as the primary source of truth (set by normalizeTicket).
  const mod = order._module || module;
  const [hovered, setHovered] = useState(false);

  // ── SE: SIM Expiry modal (AIS140 + Mining) ──────────────────────────────
  const [showSimModal,  setShowSimModal]  = useState(false);
  const [simHovered,    setSimHovered]    = useState(false);
  const [simExtLoading, setSimExtLoading] = useState(false);
  const [simExtDone,    setSimExtDone]    = useState(false);
  const [simExtError,   setSimExtError]   = useState('');

  // ── DS: Device Status modal (Installation) ───────────────────────────────
  const [showDevModal, setShowDevModal] = useState(false);
  const [devHovered,   setDevHovered]   = useState(false);
  const [devData,      setDevData]      = useState(null);
  const [devLoading,   setDevLoading]   = useState(false);

  function handleClick() {
    if (bulkMode) onSelect(order.id);
    else onHistoryClick(order);
  }

  function isSimExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  // ── DS: call tml-api proxy → FleetEdge ──────────────────────────────────
  async function handleCheckDevice(e) {
    e.stopPropagation();
    setShowDevModal(true);
    setDevLoading(true);
    setDevData(null);
    try {
      const apiBase = import.meta.env.VITE_TML_API_URL || 'https://tml-oem-api.vercel.app';
      const res  = await fetch(`${apiBase}/device-status?vehicle-id=${encodeURIComponent(order.vin)}`);
      const json = await res.json();
      setDevData(json.data || { onlineStatus: 'Error', error: json.err?.message || 'Unknown error' });
    } catch (err) {
      setDevData({ onlineStatus: 'Error', error: 'Network error — ' + err.message });
    } finally {
      setDevLoading(false);
    }
  }

  const btnBase = {
    fontSize: 10, padding: '3px 8px', borderRadius: 5,
    fontWeight: 600, cursor: 'pointer', flexShrink: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'all 0.12s', border: 'none',
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
        style={{
          background:   selected ? '#EFF6FF' : hovered ? '#F8FAFC' : '#fff',
          border:       `1px solid ${selected ? '#2563EB' : hovered ? '#CBD5E1' : '#E2E8F0'}`,
          borderRadius: 7, padding: '8px 11px', marginBottom: 5,
          cursor: 'pointer', transition: 'all 0.12s ease',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: selected
            ? '0 0 0 2px rgba(37,99,235,0.15)'
            : hovered ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {/* Checkbox */}
        {bulkMode && (
          <div style={{
            width: 15, height: 15, borderRadius: 4, flexShrink: 0,
            border: `2px solid ${selected ? '#2563EB' : '#CBD5E1'}`,
            background: selected ? '#2563EB' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>
            {selected && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-5" /></svg>}
          </div>
        )}

        {/* VIN + Tracking */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1E293B', fontFamily: "'DM Mono', monospace", letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {order.vin || 'No VIN'}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginTop: 1, letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {order.tracking_id || order.id}
          </div>
        </div>

        {/* CTA buttons — hidden in bulk mode */}
        {!bulkMode && (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>

            {/* AIS140 + Mining: SE button (SIM Expiry) */}
            {(mod === 'AIS140' || mod === 'Mining') && (
              <div style={{ position: 'relative' }}
                onMouseEnter={() => setSimHovered(true)}
                onMouseLeave={() => setSimHovered(false)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSimModal(true); }}
                  style={{
                    ...btnBase,
                    background: isSimExpired(order.sim_expiry_date) ? '#FEF2F2' : '#F0FDF4',
                    color:      isSimExpired(order.sim_expiry_date) ? '#DC2626' : '#166534',
                    border:     `1px solid ${isSimExpired(order.sim_expiry_date) ? '#FECACA' : '#BBF7D0'}`,
                  }}
                >
                  SE
                </button>
                {simHovered && (
                  <div style={{
                    position: 'absolute', bottom: '110%', right: 0,
                    background: '#1E293B', color: '#fff', fontSize: 10,
                    padding: '4px 8px', borderRadius: 5, whiteSpace: 'nowrap',
                    pointerEvents: 'none', zIndex: 10,
                  }}>
                    {isSimExpired(order.sim_expiry_date) ? '⚠ SIM Expired' : 'Check SIM Expiry'}
                  </div>
                )}
              </div>
            )}

            {/* Installation: DS button (Device Status) */}
            {mod === 'Installation' && (
              <div style={{ position: 'relative' }}
                onMouseEnter={() => setDevHovered(true)}
                onMouseLeave={() => setDevHovered(false)}
              >
                <button
                  onClick={handleCheckDevice}
                  style={{ ...btnBase, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
                >
                  DS
                </button>
                {devHovered && (
                  <div style={{
                    position: 'absolute', bottom: '110%', right: 0,
                    background: '#1E293B', color: '#fff', fontSize: 10,
                    padding: '4px 8px', borderRadius: 5, whiteSpace: 'nowrap',
                    pointerEvents: 'none', zIndex: 10,
                  }}>
                    Check Device Status
                  </div>
                )}
              </div>
            )}

            {/* Move button */}
            <button
              onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
              style={{ ...btnBase, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
            >
              Move
            </button>
          </div>
        )}
      </div>

      {/* ── SIM Expiry Modal (AIS140 + Mining) ────────────────────────────────── */}
      {showSimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { e.stopPropagation(); setShowSimModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: 360, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>SIM Expiry</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{order.vin}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Device IMEI</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: "'DM Mono', monospace" }}>{order.device_imei || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Expiry Date</span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isSimExpired(order.sim_expiry_date) ? '#DC2626' : '#166534',
                fontFamily: "'DM Mono', monospace",
              }}>
                {order.sim_expiry_date
                  ? new Date(order.sim_expiry_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
                  : '—'}
              </span>
            </div>

            {isSimExpired(order.sim_expiry_date) ? (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginBottom: 6 }}>⚠ SIM Expired</div>
                {simExtDone ? (
                  <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '6px 12px' }}>
                    ✓ Extension requested successfully
                  </div>
                ) : (
                  <>
                    {simExtError && (
                      <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 6 }}>{simExtError}</div>
                    )}
                    <button
                      disabled={simExtLoading}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const iccId = order.iccid || order.device_iccid || order.icc_id;
                        if (!iccId) { setSimExtError('No ICCID found for this ticket.'); return; }
                        setSimExtLoading(true);
                        setSimExtError('');
                        try {
                          const apiBase = import.meta.env.VITE_TML_API_URL || 'https://tml-oem-api.vercel.app';
                          // Extend by 1 year from today
                          const newExpiry = new Date();
                          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
                          const expiryDate = newExpiry.toISOString().split('T')[0];
                          const res = await fetch(`${apiBase}/sim/expiry`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ iccId, expiryDate }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            setSimExtError(err?.err?.message || 'Extension failed.');
                          } else {
                            setSimExtDone(true);
                          }
                        } catch (err) {
                          setSimExtError('Network error: ' + err.message);
                        } finally {
                          setSimExtLoading(false);
                        }
                      }}
                      style={{ fontSize: 12, padding: '6px 16px', borderRadius: 7, border: 'none', background: simExtLoading ? '#94A3B8' : '#DC2626', color: '#fff', fontWeight: 600, cursor: simExtLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {simExtLoading ? 'Requesting…' : 'Request SIM Extension'}
                    </button>
                  </>
                )}
            ) : order.sim_expiry_date ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#166534', fontWeight: 600 }}>
                ✓ SIM is active
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>No SIM data for this VIN.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={(e) => { e.stopPropagation(); setShowSimModal(false); }} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Device Status Modal (Installation) ────────────────────────────────── */}
      {showDevModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { e.stopPropagation(); setShowDevModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: 400, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Device Status</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{order.vin}</div>

            {devLoading ? (
              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>Fetching device status…</div>
            ) : devData ? (
              <>
                {devData.onlineStatus && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background:
                      devData.onlineStatus === 'Online'  ? '#F0FDF4' :
                      devData.onlineStatus === 'Partial' ? '#FEF3C7' : '#FEF2F2',
                    border: `1px solid ${
                      devData.onlineStatus === 'Online'  ? '#BBF7D0' :
                      devData.onlineStatus === 'Partial' ? '#FDE68A' : '#FECACA'}`,
                    borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background:
                        devData.onlineStatus === 'Online'  ? '#22C55E' :
                        devData.onlineStatus === 'Partial' ? '#F59E0B' : '#EF4444',
                      boxShadow: devData.onlineStatus === 'Online' ? '0 0 0 3px rgba(34,197,94,0.25)' : 'none',
                    }} />
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color:
                        devData.onlineStatus === 'Online'  ? '#166534' :
                        devData.onlineStatus === 'Partial' ? '#92400E' : '#991B1B',
                    }}>
                      {devData.onlineStatus}
                    </span>
                    {devData.receivedMessages?.length > 0 && (
                      <span style={{ fontSize: 10, color: '#64748B', marginLeft: 'auto' }}>
                        {devData.receivedMessages.join(' · ')}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '12px 14px' }}>
                  {devData.error ? (
                    <div style={{ fontSize: 12, color: '#DC2626' }}>{devData.error}</div>
                  ) : (
                    [
                      ['Telemetry Last Seen',  devData.telemetryLastMessageDateTime],
                      ['CAN Last Seen',        devData.canLastMessageDateTime],
                      ['Telemetry Odometer',   devData.telemetryOdometer   != null ? `${devData.telemetryOdometer} km`   : null],
                      ['CAN Odometer',         devData.canOdometer         != null ? `${devData.canOdometer} km`         : null],
                    ].filter(([, v]) => v != null).map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>No data available.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={(e) => { e.stopPropagation(); setShowDevModal(false); }} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
