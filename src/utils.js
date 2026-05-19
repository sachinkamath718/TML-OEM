export function generateId() {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
}

export function generateTrackingId() {
  return 'TRK-' + Date.now().toString(36).toUpperCase();
}

export function formatDate(iso) {
  if (!iso) return '—';
  // Supabase timestamps are UTC but often lack the 'Z' suffix. Append 'Z' if missing timezone info.
  let safeIso = iso;
  if (iso.includes('T') && !iso.endsWith('Z') && !iso.split('T')[1].includes('+') && !iso.split('T')[1].includes('-')) {
    safeIso += 'Z';
  }
  const d = new Date(safeIso);
  return (
    d.toLocaleDateString('en-IN', {
      day:      '2-digit',
      month:    'short',
      year:     'numeric',
      timeZone: 'Asia/Kolkata',
    }) +
    ' ' +
    d.toLocaleTimeString('en-IN', {
      hour:     '2-digit',
      minute:   '2-digit',
      timeZone: 'Asia/Kolkata',
    })
  );
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
