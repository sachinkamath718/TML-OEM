import { useState } from 'react';
import { COLUMNS } from '../constants';

const MOVE_COLUMNS = COLUMNS.filter((c) => c !== 'Pending');

const COL_COLORS = {
  'In Process': '#2563EB',
  'Completed':  '#059669',
  'On Hold':    '#7C3AED',
  'Failed':     '#DC2626',
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: "'DM Sans', system-ui, sans-serif",
  background: '#F8FAFC', color: '#0F172A',
};

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#64748B',
  display: 'block', marginBottom: 6, letterSpacing: 0.5,
};

export default function BulkMoveModal({ count, onClose, onMove }) {
  const [targetCol, setTargetCol] = useState(MOVE_COLUMNS[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return setError('Name is required.');
    if (!phone.trim()) return setError('Phone is required.');
    if (!note.trim()) return setError('Reason note is required.');
    setError('');
    setLoading(true);
    await onMove({ targetCol, user: { name, phone, role }, note });
    setLoading(false);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 480, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Bulk Move</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Moving <span style={{ color: '#2563EB', fontWeight: 600 }}>{count} ticket{count !== 1 ? 's' : ''}</span> to a new status
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#64748B', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>MOVE TO *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOVE_COLUMNS.map((col) => {
              const active = targetCol === col;
              const color = COL_COLORS[col] || '#2563EB';
              return (
                <button
                  key={col}
                  onClick={() => setTargetCol(col)}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    border: `1px solid ${active ? color : '#E2E8F0'}`,
                    background: active ? color + '12' : '#F8FAFC',
                    color: active ? color : '#64748B',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    transition: 'all 0.12s',
                  }}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>YOUR NAME *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PHONE *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>ROLE</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Field Engineer" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>REASON / NOTE *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for this bulk status change..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 14, background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#64748B', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: loading ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            {loading ? 'Updating...' : `Move ${count} Ticket${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
