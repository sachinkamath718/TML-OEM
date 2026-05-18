import { useState } from 'react';
import { generateId } from '../utils';
import { supabase } from '../supabaseClient';

export default function NewOrderModal({ onClose, onCreated }) {
  const [vins,    setVins]    = useState('');
  const [oem,     setOem]     = useState('Tata Motors');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #D1D5DB', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', background: '#fff',
  };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };

  async function handleCreate() {
    const vinList = vins.split('\n').map((v) => v.trim().toUpperCase()).filter(Boolean);
    if (vinList.length === 0) return setError('Enter at least one VIN.');
    if (!oem.trim())          return setError('OEM name required.');
    setError('');
    setLoading(true);

    try {
      // 1. Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number:   'ORD-' + generateId().slice(0, 8).toUpperCase(),
          tracking_id:    'TRK-' + generateId().slice(0, 8).toUpperCase(),
          client_ref_id:  1,
          oem_name:       oem.trim(),
          total_vehicles: vinList.length,
          status:         'pending',
          created_by:     'System',
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // 2. Create vehicle + all module tickets for each VIN
      for (const vin of vinList) {
        const trackingId = 'TRK-' + generateId().slice(0, 8).toUpperCase();

        // order_vehicles
        await supabase.from('order_vehicles').insert({
          order_id:    order.id,
          vin,
          ticket_id:   'TKT-' + generateId().slice(0, 8).toUpperCase(),
          tracking_id: trackingId,
          status:      'pending',
        });

        const base = { vin, tracking_id: trackingId, order_id: order.id, status: 'pending' };

        await supabase.from('shipment_tickets').insert({ ...base, ticket_no: 'SHP-' + generateId().slice(0, 8).toUpperCase() });
        await supabase.from('delivery_tickets').insert({ ...base, ticket_no: 'DLV-' + generateId().slice(0, 8).toUpperCase() });
        await supabase.from('installation_tickets').insert({ ...base, ticket_no: 'INS-' + generateId().slice(0, 8).toUpperCase() });
        await supabase.from('ais140_tickets').insert({ ...base, ticket_no: 'AIS-' + generateId().slice(0, 8).toUpperCase() });
        await supabase.from('mining_tickets').insert({ ...base, mining_ticket_no: 'MIN-' + generateId().slice(0, 8).toUpperCase() });
      }

      onCreated?.();
      onClose();
    } catch (err) {
      setError('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', width: 420, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={(e) => e.stopPropagation()}>

        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Add Vehicles</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Enter one VIN per line. Tickets will be created across all modules automatically.</div>

        {/* Created By — read-only */}
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Created By</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'DM Mono, monospace' }}>System</span>
            <span style={{ fontSize: 10, color: '#9CA3AF', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 4, padding: '1px 6px' }}>🔒 read-only</span>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>OEM Name</label>
          <input value={oem} onChange={(e) => setOem(e.target.value)} placeholder="Tata Motors" style={inp} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>VIN Numbers * <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(one per line)</span></label>
          <textarea
            value={vins}
            onChange={(e) => setVins(e.target.value)}
            placeholder={'MAT458391RWE60021\nMAT458391RWE60064\nMAT458391RWE60098'}
            rows={5}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
          />
          {vins.trim() && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              {vins.split('\n').filter((v) => v.trim()).length} VIN{vins.split('\n').filter((v) => v.trim()).length !== 1 ? 's' : ''} entered
            </div>
          )}
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7, marginBottom: 14 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: loading ? '#A5B4FC' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
