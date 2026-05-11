import { useState } from 'react';

const COLUMNS = ['Pending', 'In Progress', 'Completed', 'On Hold', 'Failed'];

const COL_STYLES = {
  Pending:       { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF' },
  'In Progress': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8' },
  Completed:     { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB' },
  'On Hold':     { bg: '#FFFDF0', text: '#966A00', border: '#FFE066' },
  Failed:        { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9' },
};

function toDisplayStatus(status) {
  const map = {
    pending: 'Pending', in_progress: 'In Progress', completed: 'Completed',
    on_hold: 'On Hold', failed: 'Failed',
    'Pending': 'Pending', 'In Progress': 'In Progress', 'Completed': 'Completed',
    'On Hold': 'On Hold', 'Failed': 'Failed',
  };
  return map[status] || 'Pending';
}

// Returns fields to show based on module — always shown regardless of transition
function getFieldConfig(module) {
  if (module === 'Orders')       return { type: 'orders' };
  if (module === 'Shipment')     return { type: 'shipment' };
  if (module === 'Delivery')     return { type: 'delivery' };
  if (module === 'Installation') return { type: 'installation' };
  return { type: 'none' };
}

export default function MoveModal({ order, module, onClose, onMove }) {
  const [targetCol, setTargetCol] = useState('');
  const [remarks,   setRemarks]   = useState('');

  // Shipment
  const [courier,          setCourier]          = useState('');
  const [trackingNumber,   setTrackingNumber]   = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');

  // Delivery
  const [deliveredTo,  setDeliveredTo]  = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Installation
  const [technicianName, setTechnicianName] = useState('');
  const [scheduledDate,  setScheduledDate]  = useState('');

  const [error, setError] = useState('');

  const fromStatus  = toDisplayStatus(order?.status);
  const updatedAt   = new Date().toISOString();
  const fieldConfig = getFieldConfig(module);

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #E2E8F0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', system-ui, sans-serif",
    background: '#fff', color: '#0F172A',
  };
  const readonlyInp = { ...inp, background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' };

  const label = (text, required) => (
    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
      {text}{required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
  );

  function handleConfirm() {
    if (!targetCol) return setError('Please select a target status.');

    const extraFields = {};
    let notes = '';

    // Shipment — all fields mandatory
    if (fieldConfig.type === 'shipment') {
      if (!courier.trim())        return setError('Courier is required.');
      if (!trackingNumber.trim()) return setError('Tracking number is required.');
      if (!expectedDelivery)      return setError('Expected delivery date is required.');
      Object.assign(extraFields, {
        courier,
        awb_number:        trackingNumber,
        expected_delivery: expectedDelivery,
      });
    }

    // Delivery — all fields mandatory
    if (fieldConfig.type === 'delivery') {
      if (!deliveredTo.trim()) return setError('Delivered To is required.');
      if (!deliveryDate)       return setError('Delivery date is required.');
      Object.assign(extraFields, {
        delivered_to:  deliveredTo,
        delivery_date: deliveryDate,
      });
    }

    // Installation — Pending → In Progress mandatory, rest optional
    if (fieldConfig.type === 'installation') {
      if (fromStatus === 'Pending' && targetCol === 'In Progress') {
        if (!technicianName.trim()) return setError('Technician name is required.');
        if (!scheduledDate)         return setError('Scheduled date is required.');
      }
      if (technicianName.trim()) extraFields.technician_name = technicianName;
      if (scheduledDate)         extraFields.scheduled_date  = scheduledDate;
    }

    // Orders — remarks optional, saved as notes
    if (fieldConfig.type === 'orders' && remarks.trim()) {
      extraFields.metadata = { ...(order?.metadata || {}), remarks: remarks.trim() };
      notes = remarks.trim();
    }

    setError('');
    onMove({ targetCol, extraFields, notes });
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, padding: '26px 28px', width: 480, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'DM Sans', system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Move Ticket</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>
            {order?.vin || order?.id} · {module}
          </div>
        </div>

        {/* Current status */}
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

        {/* Target column pills */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Move to <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {COLUMNS.filter((c) => c !== fromStatus).map((col) => {
              const cs  = COL_STYLES[col];
              const sel = targetCol === col;
              return (
                <button
                  key={col}
                  onClick={() => { setTargetCol(col); setError(''); }}
                  style={{
                    fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
                    fontWeight: sel ? 700 : 500,
                    border:     `1.5px solid ${sel ? cs.border : '#E2E8F0'}`,
                    background: sel ? cs.bg : '#F8FAFC',
                    color:      sel ? cs.text : '#64748B',
                    fontFamily: 'inherit', transition: 'all 0.1s',
                  }}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>

        {/* Updated at — always shown once target selected */}
        {targetCol && (
          <div style={{ marginBottom: 14, background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Updated At</span>
            <span style={{ fontSize: 11, color: '#475569', fontFamily: "'DM Mono', monospace" }}>
              {new Date(updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
          </div>
        )}

        {/* Orders fields */}
        {fieldConfig.type === 'orders' && targetCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              {label('Order ID')}
              <input value={order?.order_number || order?.id || '—'} readOnly style={readonlyInp} />
            </div>
            <div>
              {label('Created By')}
              <input value={order?.created_by || 'System'} readOnly style={readonlyInp} />
            </div>
            <div>
              {label('Remarks')}
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks…"
                rows={2}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {/* Shipment fields — always mandatory */}
        {fieldConfig.type === 'shipment' && targetCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              {label('Courier', true)}
              <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Blue Dart" style={inp} />
            </div>
            <div>
              {label('AWB / Tracking Number', true)}
              <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="AWB number" style={inp} />
            </div>
            <div>
              {label('Expected Delivery Date', true)}
              <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} style={inp} />
            </div>
          </div>
        )}

        {/* Delivery fields — always mandatory */}
        {fieldConfig.type === 'delivery' && targetCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              {label('Delivered To', true)}
              <input value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} placeholder="Recipient name / location" style={inp} />
            </div>
            <div>
              {label('Delivery Date', true)}
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} style={inp} />
            </div>
          </div>
        )}

        {/* Installation fields — Pending→InProgress mandatory, rest optional */}
        {fieldConfig.type === 'installation' && targetCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              {label('Technician Name', fromStatus === 'Pending' && targetCol === 'In Progress')}
              <input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="e.g. Ravi Kumar"
                style={inp}
              />
            </div>
            <div>
              {label('Scheduled Date', fromStatus === 'Pending' && targetCol === 'In Progress')}
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={inp}
              />
            </div>
          </div>
        )}

        {/* AIS140 / Mining — no extra fields for now, API details coming later */}
        {(module === 'AIS140' || module === 'Mining') && targetCol && (
          <div style={{ marginBottom: 14, fontSize: 12, color: '#94A3B8', background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
            Status will be updated. Additional fields will be available once API is connected.
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!targetCol}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: targetCol ? '#2563EB' : '#CBD5E1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: targetCol ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            Confirm Move
          </button>
        </div>
      </div>
    </div>
  );
}
