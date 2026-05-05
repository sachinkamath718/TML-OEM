# OEM Order Tracking System

A Jira-style kanban board for tracking OEM vehicle orders across all fulfillment stages.

## Features

- **6 Module Tabs** — Orders, Shipment, Delivery, Installation, AIS140, Mining
- **5-Column Kanban** — Pending → In Process → Completed → On Hold → Failed
- **Ticket Cards** — VIN-based tickets with priority, tags, assignee, and update count
- **Move with Audit** — every status change requires updater name, phone, role, and a reason note
- **Full History** — click any ticket to see the complete audit trail with timestamps
- **Search** — filter by order ID, title, or customer
- **Shared Tracking ID** — one tracking ID per order spans all modules

## Project Structure

```
src/
├── components/
│   ├── Avatar.jsx          # Initials avatar
│   ├── HistoryModal.jsx    # Audit trail popup
│   ├── KanbanColumn.jsx    # Column with cards
│   ├── MoveModal.jsx       # Status change form
│   ├── NewOrderModal.jsx   # Create order form
│   ├── Sidebar.jsx         # Module navigation
│   └── TicketCard.jsx      # Individual ticket card
├── App.jsx                 # Root component + state
├── constants.js            # Modules, columns, colors
├── sampleData.js           # Seed orders
└── utils.js                # ID generation, date formatting
```

## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Integration Points

The two key functions to replace with real API calls are in `App.jsx`:

- **`handleMove()`** — called when a ticket is moved between columns. Hook into your status-update API here.
- **`handleCreate()`** — called when a new order is created. Hook into your order creation API here.

### Webhook Triggers (per spec)

Add webhook calls inside `handleMove()` when:
- Module is **Shipment** or **Installation** AND `targetCol === 'Completed'`
- Module is **AIS140** or **Mining** AND `targetCol === 'In Process'` (handler details) or `'Completed'` (certificate path)

## Tech Stack

- React 18 (Create React App)
- No external UI libraries — pure inline styles
- Zero runtime dependencies beyond React
