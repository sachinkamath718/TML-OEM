import { useState } from 'react';

const COLUMNS = ['Pending', 'In Process', 'Completed', 'On Hold', 'Failed'];
const COL_STYLES = {
  Pending:      { bg: '#F0F4FF', text: '#3B5BDB', border: '#C5D0FF' },
  'In Process': { bg: '#FFF8F0', text: '#D9480F', border: '#FFD8A8' },
  Completed:    { bg: '#F0FFF4', text: '#1A7340', border: '#B2F2BB' },
  'On Hold':    { bg: '#FFFDF0', text: '#966A00', border: '#FFE066' },
  Failed:       { bg: '#FFF0F0', text: '#C92A2A', border: '#FFC9C9' },
};

export default function MoveModal({ order, onClose, onMove }) {
  const [targetCol, setTargetCol] = useState('');
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [role,  setRole]  = useState('');
  const [note,  setNote]  = useState('');
  const [error, setError] = useState('');

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #E2E8F0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', system-ui, sans-serif",
    background: '#fff', color: '#0F172A',
  };

  function handleConfirm() {
    if (!targetCol)   return setError('Please select a target status.');
    if (!name.trim()) return setError('Your name is required.');
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) return setError('Valid 10-digit phone required.');
    if (!note.trim()) return setError('A reason note is required.');
    setError('');
    onMove({ targetCol, user: { name, phone, role }, note });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '26px 28px', width: 460, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'DM Sans', system-ui, sans-serif" }} onClick={(e) => e.stopPropagation()}>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Move Ticket</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>
            {order?.vin || order?.id}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Move to *</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {COLUMNS.filter((c) => c !== order?.status).map((col) => {
              const cs = COL_STYLES[col];
              const sel = targetCol === col;
              return (
                <button key={col} onClick={() => setTargetCol(col)} style={{
                  fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
                  fontWeight: sel ? 700 : 500,
                  border: `1.5px solid ${sel ? cs.border : '#E2E8F0'}`,
                  background: sel ? cs.bg : '#F8FAFC',
                  color: sel ? cs.text : '#64748B',
                  fontFamily: 'inherit',
                }}>{col}</button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" style={inp} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Role / Department</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Logistics Manager" style={inp} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Note / Reason *</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for status change…" rows={3} style={{ ...inp, resize: 'vertical' }} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Confirm Move
          </button>
        </div>
      </div>
    </div>
  );
}
