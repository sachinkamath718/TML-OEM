import { useState } from 'react';

const COLUMNS = ['Pending', 'In Progress', 'Completed', 'On Hold', 'Failed'];

const COL_STYLES = {
  Pending:       { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF' },
  'In Progress': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8' },
  Completed:     { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB' },
  'On Hold':     { bg: '#FFFDF0', text: '#966A00', border: '#FFE066' },
  Failed:        { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9' },
};

function getFieldConfig(module, fromStatus, toStatus) {
  if (module === 'Orders')       return { type: 'orders' };
  if (module === 'Shipment')     return fromStatus === 'In Progress' && toStatus === 'Completed' ? { type: 'shipment_complete' } : { type: 'none' };
  if (module === 'Delivery')     return fromStatus === 'In Progress' && toStatus === 'Completed' ? { type: 'delivery_complete' } : { type: 'none' };
  if (module === 'Installation') return fromStatus === 'Pending'     && toStatus === 'In Progress' ? { type: 'installation_start' } : { type: 'none' };
  return { type: 'none' };
}

export default function MoveModal({ order, module, onClose, onMove }) {
  const [targetCol, setTargetCol] = useState('');
  const [remarks,   setRemarks]   = useState('');

  // Shipment complete
  const [courier,          setCourier]          = useState('');
  const [trackingNumber,   setTrackingNumber]   = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');

  // Delivery complete
  const [deliveredTo,  setDeliveredTo]  = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Installation start
  const [technicianName, setTechnicianName] = useState('');
  const [scheduledDate,  setScheduledDate]  = useState('');

  const [error, setError] = useState('');

  const updatedAt   = new Date().toISOString();
  const fieldConfig = targetCol ? getFieldConfig(module, order?.status, targetCol) : { type: 'none' };

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
    console.log('handleConfirm fired', { targetCol, fieldConfig });

    // extraFields = only real DB columns for the ticket table
    // notes       = goes to order_status_history only (handled in App.jsx writeHistory)
    const extraFields = {};
    let notes = '';

    if (fieldConfig.type === 'shipment_complete') {
      if (!courier.trim())        return setError('Courier is required.');
      if (!trackingNumber.trim()) return setError('Tracking number is required.');
      if (!expectedDelivery)      return setError('Expected delivery date is required.');
      // courier, awb_number, expected_delivery are real columns on shipment_tickets
      Object.assign(extraFields, {
        courier,
        awb_number:        trackingNumber,
        expected_delivery: expectedDelivery,
      });
    }

    if (fieldConfig.type === 'delivery_complete') {
      if (!deliveredTo.trim()) return setError('Delivered To is required.');
      if (!deliveryDate)       return setError('Delivery date is required.');
      // delivered_to, delivery_date are real columns on delivery_tickets
      Object.assign(extraFields, {
        delivered_to:  deliveredTo,
        delivery_date: deliveryDate,
      });
    }

    if (fieldConfig.type === 'installation_start') {
      if (!technicianName.trim()) return setError('Technician name is required.');
      if (!scheduledDate)         return setError('Scheduled date is required.');
      // technician_name, scheduled_date are real columns on installation_tickets
      Object.assign(extraFields, {
        technician_name: technicianName,
        scheduled_date:  scheduledDate,
      });
    }

    if (fieldConfig.type === 'orders' && remarks.trim()) {
      // orders table has no `remarks` column — store in metadata JSONB
      // and also pass as notes for the history row
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

        {/* Target column pills */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Move to *</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {COLUMNS.filter((c) => c !== order?.status).map((col) => {
              const cs  = COL_STYLES[col];
              const sel = targetCol === col;
              return (
                <button
                  key={col}
                  onClick={() => { setTargetCol(col); setError(''); }}
                  style={{
                    fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
                    fontWeight: sel ? 700 : 500,
                    border: `1.5px solid ${sel ? cs.border : '#E2E8F0'}`,
                    background: sel ? cs.bg : '#F8FAFC',
                    color: sel ? cs.text : '#64748B',
                    fontFamily: 'inherit', transition: 'all 0.1s',
                  }}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>

        {/* Updated at — always shown when a column is selected */}
        {targetCol && (
          <div style={{ marginBottom: 14, background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Updated At</span>
            <span style={{ fontSize: 11, color: '#475569', fontFamily: "'DM Mono', monospace" }}>{new Date(updatedAt).toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Orders module */}
        {fieldConfig.type === 'orders' && (
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

        {/* Shipment: In Progress → Completed */}
        {fieldConfig.type === 'shipment_complete' && (
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

        {/* Delivery: In Progress → Completed */}
        {fieldConfig.type === 'delivery_complete' && (
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

        {/* Installation: Pending → In Progress */}
        {fieldConfig.type === 'installation_start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              {label('Technician Name', true)}
              <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="e.g. Ravi Kumar" style={inp} />
            </div>
            <div>
              {label('Scheduled Date', true)}
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={inp} />
            </div>
          </div>
        )}

        {/* No extra fields needed */}
        {fieldConfig.type === 'none' && targetCol && (
          <div style={{ marginBottom: 14, fontSize: 12, color: '#94A3B8', background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
            No additional information required for this transition.
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
