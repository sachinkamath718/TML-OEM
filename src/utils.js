export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
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
