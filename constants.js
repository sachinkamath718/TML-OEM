export const MODULES = ['Orders', 'Shipment', 'Delivery', 'Installation', 'AIS140', 'Mining'];

export const COLUMNS = ['Pending', 'In Process', 'Completed', 'On Hold', 'Failed'];

export const COL_COLORS = {
  Pending:      { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  'In Process': { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  Completed:    { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  'On Hold':    { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' },
  Failed:       { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
};

export const PRIORITY_COLORS = {
  High:   { bg: '#FEE2E2', text: '#991B1B' },
  Medium: { bg: '#FEF3C7', text: '#92400E' },
  Low:    { bg: '#DCFCE7', text: '#166534' },
};

export const MODULE_ICONS = {
  Orders:       '📦',
  Shipment:     '🚛',
  Delivery:     '🏠',
  Installation: '🔧',
  AIS140:       '📡',
  Mining:       '⛏️',
};

export const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F59E0B', '#10B981',
];
