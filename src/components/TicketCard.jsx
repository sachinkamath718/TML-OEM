import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatDate } from '../utils';

export default function TicketCard({ order, module, onMoveClick, onHistoryClick, selected, onSelect, bulkMode }) {
  const [hovered, setHovered] = useState(false);

  // SE button state (Installation)
  const [showSimModal,  setShowSimModal]  = useState(false);
  const [simHovered,    setSimHovered]    = useState(false);
  const [simData,       setSimData]       = useState(null);
  const [simLoading,    setSimLoading]    = useState(false);

  // IMEI button state (AIS140)
  const [showImeiModal, setShowImeiModal] = useState(false);
  const [imeiHovered,   setImeiHovered]   = useState(false);
  const [imeiValue,     setImeiValue]     = useState('');
  const [imeiLoading,   setImeiLoading]   = useState(false);
  const [imeiSaved,     setImeiSaved]     = useState(false);

  // Device status button state (AIS140)
  const [showDevModal,  setShowDevModal]  = useState(false);
  const [devHovered,    setDevHovered]    = useState(false);
  const [devData,       setDevData]       = useState(null);
  const [devLoading,    setDevLoading]    = useState(false);

  function handleClick() {
    if (bulkMode) onSelect(order.id);
    else onHistoryClick(order);
  }

  // ── SE: fetch SIM expiry from order_vehicles ──────────────────────────────
  async function handleCheckSim(e) {
    e.stopPropagation();
    setShowSimModal(true);
    setSimLoading(true);
    const { data, error } = await supabase
      .from('order_vehicles')
      .select('sim_expiry_date, vin, iccid')
      .eq('vin', order.vin)
      .single();
    setSimData(error ? null : data);
    setSimLoading(false);
  }

  function isSimExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  // ── IMEI: save to order_vehicles.device_imei ──────────────────────────────
  async function handleSaveImei(e) {
    e.stopPropagation();
    if (!imeiValue.trim()) return;
    setImeiLoading(true);
    await supabase
      .from('order_vehicles')
      .update({ device_imei: imeiValue.trim() })
      .eq('vin', order.vin);
    setImeiLoading(false);
    setImeiSaved(true);
    setTimeout(() => { setImeiSaved(false); setShowImeiModal(false); }, 1200);
  }

  // ── Device status: placeholder until API is ready ─────────────────────────
  async function handleCheckDevice(e) {
    e.stopPropagation();
    setShowDevModal(true);
    setDevLoading(true);
    // TODO: replace with real API call when available
    // const { data } = await getDeviceStatus(order.vin);
    setTimeout(() => {
      setDevData({ status: 'API not connected yet', vin: order.vin });
      setDevLoading(false);
    }, 800);
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
          background:  selected ? '#EFF6FF' : hovered ? '#F8FAFC' : '#fff',
          border:      `1px solid ${selected ? '#2563EB' : hovered ? '#CBD5E1' : '#E2E8F0'}`,
          borderRadius: 7, padding: '8px 11px', marginBottom: 5,
          cursor: 'pointer', transition: 'all 0.12s ease',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: selected ? '0 0 0 2px rgba(37,99,235,0.15)' : hovered ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {/* Checkbox */}
        {bulkMode && (
          <div style={{
            width: 15, height: 15, borderRadius: 4, flexShrink: 0,
            border:      `2px solid ${selected ? '#2563EB' : '#CBD5E1'}`,
            background:  selected ? '#2563EB' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>
            {selected && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
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

            {/* Installation: SE button */}
            {module === 'Installation' && (
              <div style={{ position: 'relative' }}
                onMouseEnter={() => setSimHovered(true)}
                onMouseLeave={() => setSimHovered(false)}
              >
                <button
                  onClick={handleCheckSim}
                  style={{ ...btnBase, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
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
                    Check SIM Expiry
                  </div>
                )}
              </div>
            )}

            {/* AIS140: IMEI + Device Status buttons */}
            {module === 'AIS140' && (
              <>
                <div style={{ position: 'relative' }}
                  onMouseEnter={() => setImeiHovered(true)}
                  onMouseLeave={() => setImeiHovered(false)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowImeiModal(true); setImeiValue(''); setImeiSaved(false); }}
                    style={{ ...btnBase, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                  >
                    IMEI
                  </button>
                  {imeiHovered && (
                    <div style={{
                      position: 'absolute', bottom: '110%', right: 0,
                      background: '#1E293B', color: '#fff', fontSize: 10,
                      padding: '4px 8px', borderRadius: 5, whiteSpace: 'nowrap',
                      pointerEvents: 'none', zIndex: 10,
                    }}>
                      Update Device IMEI
                    </div>
                  )}
                </div>
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
              </>
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

      {/* ── SIM Expiry Modal ───────────────────────────────────────────────── */}
      {showSimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { e.stopPropagation(); setShowSimModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: 360, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>SIM Expiry</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{order.vin}</div>

            {simLoading ? (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Loading…</div>
            ) : simData ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>ICCID</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: "'DM Mono', monospace" }}>{simData.iccid || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Expiry Date</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: isSimExpired(simData.sim_expiry_date) ? '#DC2626' : '#166534',
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {simData.sim_expiry_date ? new Date(simData.sim_expiry_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                  </span>
                </div>

                {isSimExpired(simData.sim_expiry_date) && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginBottom: 6 }}>⚠ SIM Expired</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); alert('SIM Extension API will be wired here.'); }}
                      style={{ fontSize: 12, padding: '6px 16px', borderRadius: 7, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Request SIM Extension
                    </button>
                  </div>
                )}

                {!isSimExpired(simData.sim_expiry_date) && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#166534', fontWeight: 600 }}>
                    ✓ SIM is active
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>No SIM data found for this VIN.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={(e) => { e.stopPropagation(); setShowSimModal(false); }} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMEI Update Modal ──────────────────────────────────────────────── */}
      {showImeiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { e.stopPropagation(); setShowImeiModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: 360, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Update Device IMEI</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{order.vin}</div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
              Device IMEI / Serial No.
            </label>
            <input
              value={imeiValue}
              onChange={(e) => setImeiValue(e.target.value)}
              placeholder="e.g. 356938035651001"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            {imeiSaved && (
              <div style={{ fontSize: 12, color: '#166534', background: '#F0FDF4', borderRadius: 7, padding: '7px 12px', marginBottom: 12 }}>
                ✓ Saved successfully
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={(e) => { e.stopPropagation(); setShowImeiModal(false); }} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSaveImei}
                disabled={imeiLoading || !imeiValue.trim()}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: imeiValue.trim() ? '#2563EB' : '#CBD5E1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: imeiValue.trim() ? 'pointer' : 'not-allowed' }}
              >
                {imeiLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Device Status Modal ────────────────────────────────────────────── */}
      {showDevModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { e.stopPropagation(); setShowDevModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: 380, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Device Status</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{order.vin}</div>

            {devLoading ? (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Fetching device status…</div>
            ) : devData ? (
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '12px 14px' }}>
                {Object.entries(devData).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', fontFamily: "'DM Mono', monospace" }}>{String(val)}</span>
                  </div>
                ))}
              </div>
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
