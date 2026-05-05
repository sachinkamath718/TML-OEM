import { useState } from 'react';
import { generateId, generateTrackingId } from '../utils';

export default function NewOrderModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [vin, setVin] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [tags, setTags] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #D1D5DB', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif',
  };

  function handleCreate() {
    if (!title.trim()) return setError('Order title required.');
    if (!customer.trim()) return setError('Customer name required.');
    if (!vin.trim()) return setError('VIN required.');
    if (!creatorName.trim()) return setError('Creator name required.');
    if (!creatorPhone.trim()) return setError('Creator phone required.');
    setError('');

    const trackingId = generateTrackingId();
    const id = 'ORD-' + generateId().slice(0, 5);

   onCreate({
  id,
  tracking_id: trackingId,
  title,
  customer,
  priority,
  tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
  status: 'Pending',
  assignee: null,
  history: [
        {
          id: 'h-' + generateId(),
          action: 'Order Created',
          from: null,
          to: 'Pending',
          timestamp: new Date().toISOString(),
          user: { name: creatorName, phone: creatorPhone, role: '' },
          note: 'New order created and placed in Pending',
        },
      ],
    });
  }

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
          width: 520, maxWidth: '94vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 18 }}>Create New Order</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Order Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Toyota Fortuner Batch 3" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Customer *</label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Company name" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
              {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>VIN *</label>
            <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="17-char VIN" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Fleet, GPS, EV" style={inputStyle} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Created By</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Name *</label>
              <input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Phone *</label>
              <input value={creatorPhone} onChange={(e) => setCreatorPhone(e.target.value)} placeholder="10-digit mobile" style={inputStyle} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12, background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleCreate} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}
