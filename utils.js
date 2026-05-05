export function generateId() {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
}

export function generateTrackingId() {
  return 'TRK-' + Date.now().toString(36).toUpperCase();
}

export function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
