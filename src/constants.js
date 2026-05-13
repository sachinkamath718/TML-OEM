export const MODULES = ['Orders', 'Shipment', 'Delivery', 'Installation', 'AIS140', 'Mining'];

// Standard columns — Orders / Shipment / Delivery / Installation
export const COLUMNS = ['Pending', 'In Progress', 'Completed', 'On Hold', 'Failed'];

// AIS140 and Mining use a different 6-column layout
export const AIS_MINING_COLUMNS = [
  'Pending',
  'In Progress',
  'On Hold',
  'Cancelled',
  'Cancelled Due To Change Request',
  'Completed',
];

// Which modules use AIS/Mining columns
export const AIS_MINING_MODULES  = ['AIS140', 'Mining'];

// Mandatory sequential transitions — Orders / Shipment / Delivery
export const STANDARD_MANDATORY_NEXT = {
  'Pending':     ['In Progress'],
  'In Progress': ['Completed'],
  'Completed':   ['On Hold'],
  'On Hold':     ['Failed'],
  'Failed':      [],
};

// Installation: Pending→InProgress mandatory; InProgress is free
export const INSTALLATION_MANDATORY_NEXT = {
  'Pending':     ['In Progress'],
  'In Progress': ['Completed', 'On Hold', 'Failed'],
  'Completed':   [],
  'On Hold':     [],
  'Failed':      [],
};

export const COL_COLORS = {
  Pending:       { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  'In Progress': { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  Completed:     { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  'On Hold':     { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' },
  Failed:        { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  Cancelled:     { bg: '#FDF4FF', text: '#86198F', border: '#F0ABFC' },
  'Cancelled Due To Change Request': { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
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
