import { useState } from 'react';
import { generateId, generateTrackingId } from '../utils';

const MODULES = ['Orders', 'Shipment', 'Delivery', 'Installation', 'AIS140', 'Mining'];

const emptyVehicle = () => ({ id: generateId(), vin: '', registration_no: '', model: '' });

export default function NewOrderModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [tags, setTags] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [vehicles, setVehicles] = useState([emptyVehicle()]);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #D1D5DB', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif',
  };

  function updateVehicle(id, field, value) {
    setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } : v));
  }

  function addVehicle() {
    setVehicles((prev) => [...prev, emptyVehicle()]);
  }

  function removeVehicle(id) {
    if (vehicles.length === 1) return; // always keep at least one
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }

  function handleCreate() {
    if (!title.trim()) return setError('Order title required.');
    if (!customer.trim()) return setError('Customer name required.');
    if (!creatorName.trim()) return setError('Creator name required.');
    if (!creatorPhone.trim()) return setError('Creator phone required.');
    for (const v of vehicles) {
      if (!v.vin.trim()) return setError(`VIN is required for all vehicles.`);
    }
    setError('');

    const trackingId = generateTrackingId();
    const baseId = 'ORD-' + generateId().slice(0, 5);
    const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);

    const historyEntry = {
      id: 'h-' + generateId(),
      action: 'Order Created',
      from: null,
      to: 'Pending',
      timestamp: new Date().toISOString(),
      user: { name: creatorName, phone: creatorPhone, role: '' },
      note: `Bulk order created with ${vehicles.length} vehicle(s)`,
    };

    // One set of module rows per vehicle
    const orders = vehicles.flatMap((vehicle) =>
      MODULES.map((module) => ({
        id: baseId + '-' + vehicle.vin.slice(-4) + '-' + module.slice(0, 3).toUpperCase(),
        tracking_id: trackingId,
        title,
        customer,
        vin: vehicle.vin,
        registration_no: vehicle.registration_no,
        model: vehicle.model,
        priority,
        tags: parsedTags,
        status: 'Pending',
        assignee: null,
        module,
        history: [historyEntry],
      }))
    );

    onCreate(orders);
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
          width: 600, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
          Create Bulk Order
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 18 }}>
          Add multiple vehicles under one order. Each vehicle gets its own tracking row across all 6 modules.
        </div>

        {/* Order Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Fleet, GPS, EV" style={inputStyle} />
          </div>
        </div>

        {/* Vehicles Section */}
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Vehicles</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} added</div>
            </div>
            <button
              onClick={addVehicle}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: '1px dashed #6366F1', background: '#EEF2FF',
                color: '#4F46E5', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              + Add Vehicle
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vehicles.map((v, idx) => (
              <div
                key={v.id}
                style={{
                  background: '#F9FAFB', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid #E5E7EB', position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>Vehicle {idx + 1}</div>
                  {vehicles.length > 1 && (
                    <button
                      onClick={() => removeVehicle(v.id)}
                      style={{
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        color: '#DC2626', borderRadius: 6, padding: '3px 10px',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>VIN *</label>
                    <input
                      value={v.vin}
                      onChange={(e) => updateVehicle(v.id, 'vin', e.target.value)}
                      placeholder="17-char VIN"
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Reg. Number</label>
                    <input
                      value={v.registration_no}
                      onChange={(e) => updateVehicle(v.id, 'registration_no', e.target.value)}
                      placeholder="MH12AB1234"
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Model</label>
                    <input
                      value={v.model}
                      onChange={(e) => updateVehicle(v.id, 'model', e.target.value)}
                      placeholder="e.g. Fortuner"
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Created By */}
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
          <button
            onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Create Order ({vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}
