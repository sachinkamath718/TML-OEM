import { useState } from 'react';

const COL_STYLES = {
  Pending:       { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF' },
  'In Progress': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8' },
  Completed:     { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB' },
  'On Hold':     { bg: '#FFFDF0', text: '#966A00', border: '#FFE066' },
  Failed:        { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9' },
  Cancelled:     { bg: '#FDF4FF', text: '#86198F', border: '#F0ABFC' },
  'Cancelled Due To Change Request': { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
};

const FREE_STATUSES  = ['In Progress', 'Completed', 'On Hold', 'Failed'];
const AIS_MINING_ALL = ['Pending', 'In Progress', 'On Hold', 'Cancelled', 'Cancelled Due To Change Request', 'Completed'];

function getValidTargets(module, fromStatus) {
  if (module === 'AIS140' || module === 'Mining') {
    return AIS_MINING_ALL.filter(c => c !== fromStatus);
  }
  if (fromStatus === 'Pending') return ['In Progress']; // mandatory first step
  return FREE_STATUSES.filter(c => c !== fromStatus);
}

/**
 * Returns the field-set type for the current module + transition pair.
 *
 * shipment_dispatch   → iccid + courier + awb + expected_delivery
 * shipment_complete   → courier + awb + delivery_date
 * delivery_complete   → delivered_to + delivery_date
 * installation_sched  → technician_name + scheduled_date + device_imei
 * installation_done   → no inputs, show device-status warning
 * orders              → optional remarks
 * none                → no inputs
 */
function getFieldType(module, fromStatus, toStatus) {
  if (module === 'Shipment') {
    if (fromStatus === 'Pending'      && toStatus === 'In Progress') return 'shipment_dispatch';
    if (fromStatus === 'In Progress'  && toStatus === 'Completed')   return 'shipment_complete';
  }
  if (module === 'Delivery') {
    if (fromStatus === 'In Progress'  && toStatus === 'Completed')   return 'delivery_complete';
    // Pending→InProgress for Delivery: no fields
  }
  if (module === 'Installation') {
    if (fromStatus === 'Pending'      && toStatus === 'In Progress') return 'installation_sched';
    if (fromStatus === 'In Progress'  && toStatus === 'Completed')   return 'installation_done';
  }
  if (module === 'AIS140' || module === 'Mining') {
    if (fromStatus === 'Pending'      && toStatus === 'In Progress') return 'ais_mining_progress';
    if (fromStatus === 'In Progress'  && toStatus === 'Completed')   return 'cert_upload';
  }
  if (module === 'Orders') return 'orders';
  return 'none';
}

function toDisplayStatus(status) {
  const map = {
    pending: 'Pending', in_progress: 'In Progress', completed: 'Completed',
    on_hold: 'On Hold', failed: 'Failed',
    'Pending': 'Pending', 'In Progress': 'In Progress', 'Completed': 'Completed',
    'On Hold': 'On Hold', 'Failed': 'Failed',
  };
  return map[status] || 'Pending';
}

export default function MoveModal({ order, module, onClose, onMove }) {
  const [targetCol, setTargetCol] = useState('');
  const [error,     setError]     = useState('');

  // Shared
  const [remarks, setRemarks] = useState('');

  // Shipment
  const [iccid,           setIccid]           = useState('');
  const [courier,         setCourier]         = useState('');
  const [awbNumber,       setAwbNumber]       = useState('');
  const [expectedDel,     setExpectedDel]     = useState('');
  const [deliveryDate,    setDeliveryDate]    = useState('');

  // Delivery
  const [deliveredTo,     setDeliveredTo]     = useState('');

  // Installation
  const [technicianName,  setTechnicianName]  = useState('');
  const [scheduledDate,   setScheduledDate]   = useState('');
  const [deviceImei,      setDeviceImei]      = useState('');
  const [certNumber,      setCertNumber]      = useState('');
  const [certFileName,    setCertFileName]    = useState('');

  const fromStatus   = toDisplayStatus(order?.status);
  const validTargets = getValidTargets(module, fromStatus);
  const isMandatory  = validTargets.length === 1;
  const fieldType    = getFieldType(module, fromStatus, targetCol);
  const updatedAt    = new Date().toISOString();

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #E2E8F0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', system-ui, sans-serif",
    background: '#fff', color: '#0F172A',
  };

  const lbl = (text, required) => (
    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
      {text}{required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
  );

  function handleConfirm() {
    if (!targetCol) return setError('Please select a target status.');

    const extraFields = {};

    if (fieldType === 'shipment_dispatch') {
      if (!iccid.trim())       return setError('ICCID is required.');
      if (!courier.trim())     return setError('Courier is required.');
      if (!awbNumber.trim())   return setError('AWB / Tracking number is required.');
      if (!expectedDel)        return setError('Expected delivery date is required.');
      Object.assign(extraFields, {
        iccid:             iccid.trim(),
        courier:           courier.trim(),
        awb_number:        awbNumber.trim(),
        expected_delivery: expectedDel,
      });
    }

    if (fieldType === 'shipment_complete') {
      if (!courier.trim())   return setError('Courier is required.');
      if (!awbNumber.trim()) return setError('AWB / Tracking number is required.');
      if (!deliveryDate)     return setError('Delivery date is required.');
      Object.assign(extraFields, {
        courier:       courier.trim(),
        awb_number:    awbNumber.trim(),
        delivery_date: deliveryDate,
      });
    }

    if (fieldType === 'delivery_complete') {
      if (!deliveredTo.trim()) return setError('Delivered To is required.');
      if (!deliveryDate)       return setError('Delivery date is required.');
      Object.assign(extraFields, {
        delivered_to:  deliveredTo.trim(),
        delivery_date: deliveryDate,
      });
    }

    if (fieldType === 'installation_sched') {
      if (!technicianName.trim()) return setError('Technician name is required.');
      if (!scheduledDate)         return setError('Scheduled date is required.');
      Object.assign(extraFields, {
        technician_name: technicianName.trim(),
        scheduled_date:  scheduledDate,
      });
    }

    if (fieldType === 'cert_upload') {
      if (!certNumber.trim())   return setError('Certificate Number is required.');
      if (!certFileName.trim()) return setError('Certificate File Name/Link is required.');
      Object.assign(extraFields, {
        certificate_number: certNumber.trim(),
        certificate_file_name: certFileName.trim(),
      });
    }

    if (fieldType === 'installation_done') {
      if (!deviceImei.trim())     return setError('Device IMEI is required.');
      Object.assign(extraFields, {
        device_imei:     deviceImei.trim(),
      });
    }

    if (fieldType === 'orders' && remarks.trim()) {
      extraFields.metadata = { ...(order?.metadata || {}), remarks: remarks.trim() };
    }

    setError('');
    onMove({ targetCol, extraFields, notes: remarks.trim() });
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, padding: '26px 28px', width: 500, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'DM Sans', system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Move Ticket</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>
            {order?.vin || order?.id} · {module}
          </div>
        </div>

        {/* Current status badge */}
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Current:</span>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color:       COL_STYLES[fromStatus]?.text,
            background:  COL_STYLES[fromStatus]?.bg,
            border:      `1px solid ${COL_STYLES[fromStatus]?.border}`,
            borderRadius: 10, padding: '2px 10px',
          }}>
            {fromStatus}
          </span>
        </div>

        {/* Target status pills */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Move to <span style={{ color: '#EF4444' }}>*</span>
          </label>

          {isMandatory && (
            <div style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              ⚠️ This is the required next step for {module}.
            </div>
          )}

          {validTargets.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
              This ticket cannot be moved further.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {validTargets.map((col) => {
                const cs  = COL_STYLES[col];
                const sel = targetCol === col;
                return (
                  <button
                    key={col}
                    onClick={() => { setTargetCol(col); setError(''); }}
                    style={{
                      fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
                      fontWeight:  sel ? 700 : 500,
                      border:      `1.5px solid ${sel ? cs.border : '#E2E8F0'}`,
                      background:  sel ? cs.bg : '#F8FAFC',
                      color:       sel ? cs.text : '#64748B',
                      fontFamily: 'inherit', transition: 'all 0.1s',
                    }}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Updated at */}
        {targetCol && (
          <div style={{ marginBottom: 14, background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Updated At</span>
            <span style={{ fontSize: 11, color: '#475569', fontFamily: "'DM Mono', monospace" }}>
              {new Date(updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
          </div>
        )}

        {/* ── Shipment: Pending → In Progress ──────────────────────────────────── */}
        {fieldType === 'shipment_dispatch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 12px' }}>
              📦 Device is being dispatched — enter shipment details
            </div>
            <div>{lbl('ICCID (SIM Card ID)', true)}<input value={iccid} onChange={e => setIccid(e.target.value)} placeholder="e.g. 89914504200014599001" style={inp} /></div>
            <div>{lbl('Courier', true)}<input value={courier} onChange={e => setCourier(e.target.value)} placeholder="e.g. Blue Dart" style={inp} /></div>
            <div>{lbl('AWB / Tracking Number', true)}<input value={awbNumber} onChange={e => setAwbNumber(e.target.value)} placeholder="AWB number" style={inp} /></div>
            <div>{lbl('Expected Delivery Date', true)}<input type="date" value={expectedDel} onChange={e => setExpectedDel(e.target.value)} style={inp} /></div>
          </div>
        )}

        {/* ── Shipment: In Progress → Completed ────────────────────────────────── */}
        {fieldType === 'shipment_complete' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
              ✅ Confirm device delivered — enter actual delivery details
            </div>
            <div>{lbl('Courier', true)}<input value={courier} onChange={e => setCourier(e.target.value)} placeholder="e.g. Blue Dart" style={inp} /></div>
            <div>{lbl('AWB / Tracking Number', true)}<input value={awbNumber} onChange={e => setAwbNumber(e.target.value)} placeholder="AWB number" style={inp} /></div>
            <div>{lbl('Actual Delivery Date', true)}<input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inp} /></div>
          </div>
        )}

        {/* ── Delivery: Pending → In Progress — no input needed ────────────────── */}
        {module === 'Delivery' && fromStatus === 'Pending' && targetCol === 'In Progress' && (
          <div style={{ fontSize: 12, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            🚚 No additional details needed — device will be marked as out for delivery.
          </div>
        )}

        {/* ── Delivery: In Progress → Completed ────────────────────────────────── */}
        {fieldType === 'delivery_complete' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
              ✅ Confirm delivery — enter handover details
            </div>
            <div>{lbl('Delivered To', true)}<input value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)} placeholder="Recipient name / location" style={inp} /></div>
            <div>{lbl('Delivery Date', true)}<input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inp} /></div>
          </div>
        )}

        {/* ── Installation: Pending → In Progress ──────────────────────────────── */}
        {fieldType === 'installation_sched' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '8px 12px' }}>
              🔧 Assign technician and schedule installation
            </div>
            <div>{lbl('Technician Name', true)}<input value={technicianName} onChange={e => setTechnicianName(e.target.value)} placeholder="e.g. Rajesh Kumar" style={inp} /></div>
            <div>{lbl('Scheduled Date', true)}<input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={inp} /></div>
          </div>
        )}

        {/* ── Installation: In Progress → Completed ─────────────────────────────── */}
        {fieldType === 'installation_done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
              ✅ Installation complete — enter device details
            </div>
            <div>{lbl('Device IMEI', true)}<input value={deviceImei} onChange={e => setDeviceImei(e.target.value)} placeholder="e.g. 356938035651001" style={inp} /></div>
            <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px' }}>
              ⚠️ <strong>Verification:</strong> This will trigger the DEVICE_INSTALLED webhook and verify connectivity via FleetEdge.
            </div>
          </div>
        )}

        {/* ── AIS140 / Mining: Pending → In Progress ──────────────────────────── */}
        {fieldType === 'ais_mining_progress' && (
          <div style={{ fontSize: 12, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            📑 Moving to In Progress will notify TML via webhook.
          </div>
        )}

        {/* ── AIS140 / Mining: In Progress → Completed ─────────────────────────── */}
        {fieldType === 'cert_upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
              📜 Upload generated certificates
            </div>
            <div>{lbl('Certificate Number', true)}<input value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="e.g. AIS-CERT-12345" style={inp} /></div>
            <div>{lbl('Certificate File Name / Link', true)}<input value={certFileName} onChange={e => setCertFileName(e.target.value)} placeholder="e.g. certificate_v1.pdf" style={inp} /></div>
          </div>
        )}

        {/* ── Orders: optional remarks ──────────────────────────────────────────── */}
        {fieldType === 'orders' && targetCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>{lbl('Order ID')}<input value={order?.order_number || order?.id || '—'} readOnly style={{ ...inp, background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }} /></div>
            <div>
              {lbl('Remarks')}
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks…" rows={2} style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!targetCol || validTargets.length === 0}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: targetCol ? '#2563EB' : '#CBD5E1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: targetCol ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            Confirm Move
          </button>
        </div>
      </div>
    </div>
  );
}
