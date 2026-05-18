import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const MODULE_COLOR = {
  AIS140:       { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  Mining:       { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' },
  Installation: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  Shipment:     { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  Delivery:     { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
};

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function WebhookLogPanel({ onClose }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // row id with expanded payload

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('api_response_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 800 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '96vw',
        background: '#fff', zIndex: 801, display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.12)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Webhook Log</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Last 30 outbound CVP / TML API calls</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={fetchLogs}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
            >
              ↻ Refresh
            </button>
            <button
              onClick={onClose}
              style={{ background: '#F1F5F9', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 15, color: '#64748B', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading && (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '40px 0' }}>Loading…</div>
          )}

          {!loading && logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No webhook logs yet</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                Logs appear here once you move a ticket and trigger an outbound CVP webhook.
              </div>
            </div>
          )}

          {!loading && logs.map((log) => {
            const mc    = MODULE_COLOR[log.module] || { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
            const isExp = expanded === log.id;
            return (
              <div
                key={log.id}
                style={{
                  border: `1px solid ${log.success ? '#D1FAE5' : '#FECACA'}`,
                  borderRadius: 9,
                  marginBottom: 10,
                  background: log.success ? '#FAFFFE' : '#FFFAFA',
                  overflow: 'hidden',
                }}
              >
                {/* Summary row */}
                <div
                  onClick={() => setExpanded(isExp ? null : log.id)}
                  style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: log.success ? '#22C55E' : '#EF4444',
                    boxShadow: log.success ? '0 0 0 3px rgba(34,197,94,0.2)' : '0 0 0 3px rgba(239,68,68,0.2)',
                  }} />

                  {/* Module badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                    background: mc.bg, color: mc.text, border: `1px solid ${mc.border}`,
                    flexShrink: 0,
                  }}>
                    {log.module}
                  </span>

                  {/* Stage */}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                    {log.stage}
                  </span>

                  {/* VIN */}
                  <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.vin || '—'}
                  </span>

                  {/* HTTP Status */}
                  {log.status_code && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8, flexShrink: 0,
                      background: log.success ? '#DCFCE7' : '#FEE2E2',
                      color: log.success ? '#166534' : '#991B1B',
                      border: `1px solid ${log.success ? '#BBF7D0' : '#FECACA'}`,
                    }}>
                      {log.status_code}
                    </span>
                  )}

                  {/* Success / Fail */}
                  <span style={{ fontSize: 12, flexShrink: 0 }}>
                    {log.success ? '✅' : '❌'}
                  </span>

                  {/* Expand chevron */}
                  <span style={{ fontSize: 10, color: '#CBD5E1', flexShrink: 0, transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                </div>

                {/* Timestamp row */}
                <div style={{ padding: '0 14px 8px', fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>
                  {fmtTs(log.created_at)}
                </div>

                {/* Expanded: request + response JSON */}
                {isExp && (
                  <div style={{ borderTop: '1px solid #F1F5F9', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <JsonBlock title="Request" data={log.request} />
                    <JsonBlock title="Response" data={log.response} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function JsonBlock({ title, data }) {
  if (!data) return null;
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
        {title}
      </div>
      <pre style={{
        margin: 0, fontSize: 10.5, color: '#334155',
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        borderRadius: 7, padding: '8px 12px',
        overflow: 'auto', maxHeight: 160,
        fontFamily: "'DM Mono', monospace", lineHeight: 1.55,
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
