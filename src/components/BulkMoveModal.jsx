import { useState } from 'react';
import { COLUMNS } from '../constants';

const MOVE_COLUMNS = COLUMNS.filter((c) => c !== 'Pending');

const COL_COLORS = {
  'In Process': '#3B82F6',
  'Completed':  '#10B981',
  'On Hold':    '#8B5CF6',
  'Failed':     '#EF4444',
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #1E293B', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: "'DM Sans', system-ui, sans-serif",
  background: '#0F1117', color: '#E2E8F0',
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#141820', borderRadius: 16, padding: '28px 32px', width: 480, maxWidth: '94vw', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid #1E293B' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>Bulk Move</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Moving <span style={{ color: '#60A5FA', fontWeight: 600 }}>{count} ticket{count !== 1 ? 's' : ''}</span> to a new status
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#1E293B', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#64748B', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Target column selector */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>MOVE TO *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOVE_COLUMNS.map((col) => {
              const active = targetCol === col;
              const color = COL_COLORS[col] || '#3B82F6';
              return (
                <button
                  key={col}
                  onClick={() => setTargetCol(col)}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    border: `1px solid ${active ? color : '#1E293B'}`,
                    background: active ? color + '18' : 'transparent',
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

        {/* User fields */}
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
          <div style={{ fontSize: 12, color: '#FCA5A5', marginBottom: 14, background: '#450A0A', padding: '10px 14px', borderRadius: 8, border: '1px solid #7F1D1D' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #1E293B', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#64748B', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: loading ? '#1E3A5F' : '#3B82F6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            {loading ? 'Updating...' : `Move ${count} Ticket${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
