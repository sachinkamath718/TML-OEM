import { useState } from 'react';
import { COLUMNS, COL_COLORS } from '../constants';

export default function MoveModal({ order, onClose, onMove }) {
  const [selectedCol, setSelectedCol] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const available = COLUMNS.filter((c) => c !== order.column);

  function handleSubmit() {
    if (!selectedCol) return setError('Please select a target column.');
    if (!name.trim()) return setError('Updater name is required.');
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) return setError('Valid 10-digit phone is required.');
    if (!note.trim()) return setError('Please add a note for this transition.');
    setError('');
    onMove({ targetCol: selectedCol, user: { name, phone, role }, note });
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          width: 480, maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{order.id}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Move Ticket</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            Currently in <strong>{order.column}</strong>
          </div>
        </div>

        {/* Target column */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Move to *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {available.map((col) => (
              <button
                key={col}
                onClick={() => setSelectedCol(col)}
                style={{
                  fontSize: 12, padding: '6px 14px', borderRadius: 8,
                  border: `1.5px solid ${selectedCol === col ? COL_COLORS[col].border : '#E5E7EB'}`,
                  background: selectedCol === col ? COL_COLORS[col].bg : '#F9FAFB',
                  color: selectedCol === col ? COL_COLORS[col].text : '#6B7280',
                  cursor: 'pointer', fontWeight: selectedCol === col ? 700 : 400,
                  transition: 'all 0.12s',
                }}
              >
                {col}
              </button>
            ))}
          </div>
        </div>

        {/* Name + Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan Sharma" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" style={inputStyle} />
          </div>
        </div>

        {/* Role */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Role / Department</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Logistics Manager" style={inputStyle} />
        </div>

        {/* Note */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Note / Reason *</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the reason for this status change..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12, background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Confirm Move
          </button>
        </div>
      </div>
    </div>
  );
}
