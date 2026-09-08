# Chakula Express — Restaurant Ordering System

A full-stack version of the restaurant ordering/POS demo: a Node/Express
**backend** (REST API + JSON file storage) and a Vite/React **frontend**
(the original UI, now talking to that API instead of browser-only
artifact storage).

```
restaurant-system/
├── backend/     Express API, orders + menu logic, data.json storage
└── frontend/    Vite + React app (customer / cashier / manager views)
```

## Why split it up

The original was a single React component using `window.storage`, which
only works inside the Artifacts sandbox and is scoped per browser tab —
fine for a demo, but a real restaurant needs the menu and order data to
live in one place that a customer's phone, the till, and the manager's
laptop all see at once. This version moves all state and business logic
(stock deduction, void/refund rules, order numbering) into the backend,
and the frontend just renders it and calls the API.

## 1. Run the backend

```bash
cd backend
npm install
npm start          # listens on http://localhost:4000
```

Data is stored in `backend/data.json`, seeded from `backend/seed.js` on
first run. Delete `data.json` any time to reset to the default menu with
no orders.

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:4000` (see
`vite.config.js`), so no extra config is needed for local development.

To point the built frontend at a different backend URL (e.g. once it's
deployed), set `VITE_API_URL` at build time:

```bash
VITE_API_URL=https://your-api.example.com/api npm run build
```

## How the pieces map to the original

| Original (artifact)                          | Now                                              |
|-----------------------------------------------|---------------------------------------------------|
| `window.storage.get/set('restaurant-menu-items')` | `GET/POST/PUT/DELETE /api/menu` |
| `window.storage.get/set('restaurant-orders')`     | `GET/POST /api/orders`, plus `/advance`, `/void`, `/request-refund`, `/decide-refund` |
| In-memory `placeOrder`, `advanceOrder`, `voidOrder`, `requestRefund`, `decideRefund` | Same logic, moved server-side in `backend/server.js` |
| Local-only login (no persistence)            | `POST /api/login` (still no password — demo auth), remembered in `localStorage` on the device |

The UI (login screen, customer/cashier/manager views, menu editor,
reports) is unchanged — it's the same component tree, just reading from
and writing to the API instead of local state + `window.storage`.

## Notes for going further

- **Auth**: logins are still just a name + role, no password — matching
  the original demo. For real use you'd want actual accounts and
  role-based access control on the API routes.
- **Storage**: `data.json` is fine for a single small deployment; for
  multiple concurrent staff/customers at scale, swap `backend/db.js` for
  a real database (Postgres/SQLite) — the rest of `server.js` wouldn't
  need to change much since it's already isolated behind `getState`/`setState`.
- **Live updates**: the frontend polls every 4 seconds. For instant
  updates you could add WebSockets/SSE, but polling is simpler and
  plenty responsive for a restaurant till.
