import { useState } from 'react';
import { generateId } from '../utils';

const FUEL_TYPES      = ['DIESEL', 'PETROL', 'CNG', 'ELECTRIC', 'HYBRID'];
const EMISSION_TYPES  = ['BS6', 'BS4', 'BS3'];
const PRODUCT_OPTIONS = ['AIS140', 'MINING', 'FLEET_TRACK', 'PANIC_BUTTON', 'IMMOBILIZER'];

const emptyVehicle = () => ({
  id: generateId(),
  vin: '', registration_no: '', engine_no: '',
  model: '', make: '', variant: '',
  mfg_year: '', fuel_type: 'DIESEL', emission_type: 'BS6',
  rto_office_code: '', rto_state: '',
  products: [{ name: 'AIS140', duration_in_years: 2, metadata: null }],
});

function formatPhone(val) {
  const t = val.trim();
  return t.startsWith('+') ? t : '+91' + t;
}

export default function NewOrderModal({ onClose, onCreate }) {
  const [title,    setTitle]    = useState('');
  const [priority, setPriority] = useState('Medium');
  const [custName,    setCustName]    = useState('');
  const [custPan,     setCustPan]     = useState('');
  const [custGst,     setCustGst]     = useState('');
  const [custEmail,   setCustEmail]   = useState('');
  const [custContact, setCustContact] = useState('');
  const [locAddress,  setLocAddress]  = useState('');
  const [locCity,     setLocCity]     = useState('');
  const [locPincode,  setLocPincode]  = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locState,    setLocState]    = useState('');
  const [spocName,    setSpocName]    = useState('');
  const [spocPhone,   setSpocPhone]   = useState('');
  const [spocEmail,   setSpocEmail]   = useState('');
  const [vehicles, setVehicles] = useState([emptyVehicle()]);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid #D1D5DB', fontSize: 12, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', background: '#fff',
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };
  const sectionStyle = { borderTop: '1px solid #F3F4F6', paddingTop: 14, marginBottom: 14 };
  const sectionTitle = { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 };

  function updateVehicle(id, field, value) {
    setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } : v));
  }
  function toggleProduct(vehicleId, productName) {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== vehicleId) return v;
      const exists = v.products.find((p) => p.name === productName);
      const products = exists
        ? v.products.filter((p) => p.name !== productName)
        : [...v.products, { name: productName, duration_in_years: 2, metadata: null }];
      return { ...v, products };
    }));
  }
  function updateProductDuration(vehicleId, productName, duration) {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== vehicleId) return v;
      return { ...v, products: v.products.map((p) => p.name === productName ? { ...p, duration_in_years: Number(duration) } : p) };
    }));
  }
  function addVehicle() { setVehicles((prev) => [...prev, emptyVehicle()]); }
  function removeVehicle(id) {
    if (vehicles.length === 1) return;
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }

  async function handleCreate() {
    if (!title.trim())       return setError('Order title required.');
    if (!custName.trim())    return setError('Customer name required.');
    if (!custContact.trim()) return setError('Customer contact required.');
    if (!locCity.trim())     return setError('Location city required.');
    if (!locState.trim())    return setError('Location state required.');
    if (!spocName.trim())    return setError('SPOC name required.');
    for (const v of vehicles) {
      if (!v.vin.trim())             return setError('VIN is required for all vehicles.');
      if (!v.engine_no.trim())       return setError(`Engine No required for VIN ${v.vin || '(empty)'}.`);
      if (!v.make.trim())            return setError(`Make required for VIN ${v.vin || '(empty)'}.`);
      if (!v.rto_office_code.trim()) return setError(`RTO Office Code required for VIN ${v.vin}.`);
      if (!v.rto_state.trim())       return setError(`RTO State required for VIN ${v.vin}.`);
      if (v.products.length === 0)   return setError(`Select at least one product for VIN ${v.vin}.`);
    }
    setError('');
    setLoading(true);

    const tmlPayload = {
      order_id: 'TML-ORD-' + generateId().slice(0, 10).toUpperCase(),
      customer_details: {
        name:           custName.trim(),
        pan:            custPan.trim().toUpperCase(),
        gst:            custGst.trim().toUpperCase(),
        email:          custEmail.trim().toLowerCase(),
        contact_number: formatPhone(custContact),
      },
      location_mappings: [{
        location: {
          id:       'LOC-' + generateId().slice(0, 6).toUpperCase(),
          address:  locAddress.trim(),
          city:     locCity.trim(),
          pincode:  locPincode.trim(),
          district: locDistrict.trim(),
          state:    locState.trim(),
        },
        spoc: {
          name:           spocName.trim(),
          contact_number: formatPhone(spocPhone),
          email:          spocEmail.trim().toLowerCase(),
        },
        vehicle_details: vehicles.map((v) => ({
          vin:             v.vin.trim().toUpperCase(),
          registration_no: v.registration_no.trim().toUpperCase(),
          engine_no:       v.engine_no.trim().toUpperCase(),
          model:           v.model.trim(),
          make:            v.make.trim().toUpperCase(),
          variant:         v.variant.trim(),
          mfg_year:        String(v.mfg_year).trim(),
          fuel_type:       v.fuel_type,
          emission_type:   v.emission_type,
          rto_office_code: v.rto_office_code.trim().toUpperCase(),
          rto_state:       v.rto_state.trim().toUpperCase(),
          products:        v.products.map((p) => ({
            ...p,
            duration_in_years: p.duration_in_years ? Number(p.duration_in_years) : null,
          })),
        })),
      }],
    };

    // Supabase payload — matches new schema
    const orderPayload = {
      order_number:     tmlPayload.order_id,
      oem_name:         title.trim(),
      total_vehicles:   vehicles.length,
      status:           'pending',
      customer_details: tmlPayload.customer_details,
      created_by:       spocName.trim(),
      metadata:         { priority, location: tmlPayload.location_mappings[0].location },
    };

    const vehicleRows = vehicles.map((v) => ({
      vin:             v.vin.trim().toUpperCase(),
      registration_no: v.registration_no.trim().toUpperCase(),
      engine_no:       v.engine_no.trim().toUpperCase(),
      model:           v.model.trim(),
      make:            v.make.trim().toUpperCase(),
      variant:         v.variant.trim(),
      mfg_year:        String(v.mfg_year).trim(),
      fuel_type:       v.fuel_type,
      emission_type:   v.emission_type,
      rto_office_code: v.rto_office_code.trim().toUpperCase(),
      rto_state:       v.rto_state.trim().toUpperCase(),
      products:        v.products.map((p) => ({ ...p, duration_in_years: p.duration_in_years ? Number(p.duration_in_years) : null })),
      status:          'pending',
    }));

    const spocRow = {
      name:       spocName.trim(),
      contact_no: formatPhone(spocPhone),
      email:      spocEmail.trim().toLowerCase(),
    };

    onCreate(tmlPayload, orderPayload, vehicleRows, spocRow);
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: 680, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={(e) => e.stopPropagation()}>

        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Create Bulk Order</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 18 }}>Fills all required TML API fields. Each vehicle is tracked across all modules.</div>

        {/* Order Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Order Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fortuner Batch 3" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
              {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Customer Details */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Customer Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Company Name *</label>
              <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Shree Ganesh Logistics Pvt Ltd" style={inputStyle} />
            </div>
            <div><label style={labelStyle}>PAN</label><input value={custPan} onChange={(e) => setCustPan(e.target.value)} placeholder="AAFCS7862Q" style={inputStyle} /></div>
            <div><label style={labelStyle}>GST</label><input value={custGst} onChange={(e) => setCustGst(e.target.value)} placeholder="29AAFCS7862Q1ZK" style={inputStyle} /></div>
            <div><label style={labelStyle}>Contact Number *</label><input value={custContact} onChange={(e) => setCustContact(e.target.value)} placeholder="+918800441122" style={inputStyle} /></div>
            <div style={{ gridColumn: '2 / -1' }}><label style={labelStyle}>Email</label><input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder="ops@company.in" style={inputStyle} /></div>
          </div>
        </div>

        {/* Location */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Location</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address</label><input value={locAddress} onChange={(e) => setLocAddress(e.target.value)} placeholder="Survey No. 45, Bhosari Industrial Estate" style={inputStyle} /></div>
            <div><label style={labelStyle}>City *</label><input value={locCity} onChange={(e) => setLocCity(e.target.value)} placeholder="Pune" style={inputStyle} /></div>
            <div><label style={labelStyle}>District</label><input value={locDistrict} onChange={(e) => setLocDistrict(e.target.value)} placeholder="Pune" style={inputStyle} /></div>
            <div><label style={labelStyle}>Pincode</label><input value={locPincode} onChange={(e) => setLocPincode(e.target.value)} placeholder="411026" style={inputStyle} /></div>
            <div style={{ gridColumn: '3 / -1' }}><label style={labelStyle}>State *</label><input value={locState} onChange={(e) => setLocState(e.target.value)} placeholder="Maharashtra" style={inputStyle} /></div>
          </div>
        </div>

        {/* SPOC */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>SPOC (Site Point of Contact)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Name *</label><input value={spocName} onChange={(e) => setSpocName(e.target.value)} placeholder="Suresh Patil" style={inputStyle} /></div>
            <div><label style={labelStyle}>Phone</label><input value={spocPhone} onChange={(e) => setSpocPhone(e.target.value)} placeholder="+917709988001" style={inputStyle} /></div>
            <div><label style={labelStyle}>Email</label><input value={spocEmail} onChange={(e) => setSpocEmail(e.target.value)} placeholder="spoc@company.in" style={inputStyle} /></div>
          </div>
        </div>

        {/* Vehicles */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={sectionTitle}>Vehicles</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: -8 }}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} added</div>
            </div>
            <button onClick={addVehicle} style={{ padding: '7px 14px', borderRadius: 8, border: '1px dashed #6366F1', background: '#EEF2FF', color: '#4F46E5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              + Add Vehicle
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {vehicles.map((v, idx) => (
              <div key={v.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>Vehicle {idx + 1}</div>
                  {vehicles.length > 1 && (
                    <button onClick={() => removeVehicle(v.id)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div><label style={labelStyle}>VIN *</label><input value={v.vin} onChange={(e) => updateVehicle(v.id, 'vin', e.target.value)} placeholder="17-char VIN" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Reg. Number</label><input value={v.registration_no} onChange={(e) => updateVehicle(v.id, 'registration_no', e.target.value)} placeholder="MH12DE4570" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Engine No *</label><input value={v.engine_no} onChange={(e) => updateVehicle(v.id, 'engine_no', e.target.value)} placeholder="CUMMINS6BT5300" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div><label style={labelStyle}>Make *</label><input value={v.make} onChange={(e) => updateVehicle(v.id, 'make', e.target.value)} placeholder="TATA" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Model</label><input value={v.model} onChange={(e) => updateVehicle(v.id, 'model', e.target.value)} placeholder="Prima 4028.S" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Variant</label><input value={v.variant} onChange={(e) => updateVehicle(v.id, 'variant', e.target.value)} placeholder="4028.S HE" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div><label style={labelStyle}>Mfg. Year</label><input value={v.mfg_year} onChange={(e) => updateVehicle(v.id, 'mfg_year', e.target.value)} placeholder="2024" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select value={v.fuel_type} onChange={(e) => updateVehicle(v.id, 'fuel_type', e.target.value)} style={inputStyle}>
                      {FUEL_TYPES.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Emission</label>
                    <select value={v.emission_type} onChange={(e) => updateVehicle(v.id, 'emission_type', e.target.value)} style={inputStyle}>
                      {EMISSION_TYPES.map((e) => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>RTO State *</label><input value={v.rto_state} onChange={(e) => updateVehicle(v.id, 'rto_state', e.target.value)} placeholder="MH" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div><label style={labelStyle}>RTO Office Code *</label><input value={v.rto_office_code} onChange={(e) => updateVehicle(v.id, 'rto_office_code', e.target.value)} placeholder="MH12" style={inputStyle} /></div>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>Products *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRODUCT_OPTIONS.map((p) => {
                      const selected = v.products.find((x) => x.name === p);
                      return (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => toggleProduct(v.id, p)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: selected ? 'none' : '1px solid #D1D5DB', background: selected ? '#4F46E5' : '#F3F4F6', color: selected ? '#fff' : '#6B7280' }}>
                            {p}
                          </button>
                          {selected && ['AIS140', 'MINING'].includes(p) && (
                            <input type="number" min="1" max="10" value={selected.duration_in_years} onChange={(e) => updateProductDuration(v.id, p, e.target.value)} style={{ ...inputStyle, width: 48, padding: '4px 6px', fontSize: 11 }} title="Duration in years" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Click to toggle. AIS140/MINING show duration (years).</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12, background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} disabled={loading} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: loading ? '#A5B4FC' : '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating…' : `Create Order (${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
}
