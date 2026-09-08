// Backend API endpoints for the POS system.
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { getState, setState } from './db.js';
import { CATEGORIES } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json());

function uid() {
  return crypto.randomBytes(5).toString('hex');
}

function serializeError(res, status, message) {
  res.status(status).json({ error: message });
}

/* ---------------- Menu ---------------- */

app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

app.get('/api/menu', (req, res) => {
  res.json(getState().menuItems);
});

app.post('/api/menu', async (req, res) => {
  const { name, category, price, hasSize, stock, available } = req.body || {};
  if (!name || !String(name).trim()) return serializeError(res, 400, 'Name is required');
  const item = {
    id: uid(),
    name: String(name).trim(),
    category: category || CATEGORIES[0],
    price: Number(price) || 0,
    hasSize: !!hasSize,
    stock: Number(stock) || 0,
    available: available !== undefined ? !!available : true,
  };
  const state = await setState((s) => ({ ...s, menuItems: [...s.menuItems, item] }));
  res.status(201).json(item);
});

app.put('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  const existing = getState().menuItems.find((m) => m.id === id);
  if (!existing) return serializeError(res, 404, 'Menu item not found');
  const { name, category, price, hasSize, stock, available } = req.body || {};
  const updated = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    category: category !== undefined ? category : existing.category,
    price: price !== undefined ? Number(price) || 0 : existing.price,
    hasSize: hasSize !== undefined ? !!hasSize : existing.hasSize,
    stock: stock !== undefined ? Number(stock) || 0 : existing.stock,
    available: available !== undefined ? !!available : existing.available,
  };
  const state = await setState((s) => ({
    ...s,
    menuItems: s.menuItems.map((m) => (m.id === id ? updated : m)),
  }));
  res.json(updated);
});

app.patch('/api/menu/:id/toggle-available', async (req, res) => {
  const { id } = req.params;
  const existing = getState().menuItems.find((m) => m.id === id);
  if (!existing) return serializeError(res, 404, 'Menu item not found');
  const state = await setState((s) => ({
    ...s,
    menuItems: s.menuItems.map((m) => (m.id === id ? { ...m, available: !m.available } : m)),
  }));
  res.json(state.menuItems.find((m) => m.id === id));
});

app.delete('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  await setState((s) => ({ ...s, menuItems: s.menuItems.filter((m) => m.id !== id) }));
  res.status(204).end();
});

/* ---------------- Orders ---------------- */

app.get('/api/orders', (req, res) => {
  const { customerName } = req.query;
  let orders = getState().orders;
  if (customerName) orders = orders.filter((o) => o.customerName === customerName);
  res.json(orders);
});

// Order placement commits stock immediately, like a real kitchen ticket —
// ingredients are used the moment the order is confirmed, not when cash changes hands.
app.post('/api/orders', async (req, res) => {
  const { customerName, lines, paymentMethod } = req.body || {};
  if (!customerName || !String(customerName).trim()) return serializeError(res, 400, 'Customer name is required');
  if (!Array.isArray(lines) || lines.length === 0) return serializeError(res, 400, 'Order must have at least one line');

  const state = getState();
  for (const l of lines) {
    const item = state.menuItems.find((m) => m.name === l.name);
    if (!item || item.stock < l.qty) {
      return serializeError(res, 409, `Not enough ${l.name} in stock`);
    }
  }

  const items = lines.map((l) => ({ name: l.name, size: l.size ?? null, qty: l.qty, unitPrice: l.unitPrice }));
  const total = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);

  const newState = await setState((s) => {
    const order = {
      id: uid(),
      number: (s.orders.length + 1).toString().padStart(4, '0'),
      customerName: String(customerName).trim(),
      items,
      total,
      paymentMethod,
      status: 'Placed',
      createdAt: Date.now(),
      paidAt: null,
      voidReason: null,
      refundReason: null,
    };
    return {
      ...s,
      orders: [order, ...s.orders],
      menuItems: s.menuItems.map((m) => {
        const usedQty = items.filter((it) => it.name === m.name).reduce((sum, it) => sum + it.qty, 0);
        return usedQty > 0 ? { ...m, stock: Math.max(0, m.stock - usedQty) } : m;
      }),
    };
  });

  res.status(201).json(newState.orders[0]);
});

const NEXT_STATUS = { Placed: 'Preparing', Preparing: 'Ready', Ready: 'Paid' };

app.patch('/api/orders/:id/advance', async (req, res) => {
  const { id } = req.params;
  const order = getState().orders.find((o) => o.id === id);
  if (!order) return serializeError(res, 404, 'Order not found');
  const next = NEXT_STATUS[order.status];
  if (!next) return serializeError(res, 409, `Order in status ${order.status} cannot be advanced`);
  const state = await setState((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === id ? { ...o, status: next, paidAt: next === 'Paid' ? Date.now() : o.paidAt } : o
    ),
  }));
  res.json(state.orders.find((o) => o.id === id));
});

// Voiding is the manager's call, and only before payment — it restores the stock
// that was committed at order time, since nothing was actually served.
app.patch('/api/orders/:id/void', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const order = getState().orders.find((o) => o.id === id);
  if (!order) return serializeError(res, 404, 'Order not found');
  if (order.status === 'Paid') return serializeError(res, 409, 'Cannot void a paid order');

  const state = await setState((s) => ({
    ...s,
    orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'Voided', voidReason: reason || 'No reason given' } : o)),
    menuItems: s.menuItems.map((m) => {
      const restoreQty = order.items.filter((it) => it.name === m.name).reduce((sum, it) => sum + it.qty, 0);
      return restoreQty > 0 ? { ...m, stock: m.stock + restoreQty } : m;
    }),
  }));
  res.json(state.orders.find((o) => o.id === id));
});

app.patch('/api/orders/:id/request-refund', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const order = getState().orders.find((o) => o.id === id);
  if (!order) return serializeError(res, 404, 'Order not found');
  if (order.status !== 'Paid') return serializeError(res, 409, 'Only paid orders can have a refund requested');
  const state = await setState((s) => ({
    ...s,
    orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'RefundRequested', refundReason: reason || 'No reason given' } : o)),
  }));
  res.json(state.orders.find((o) => o.id === id));
});

// Refunds happen after the food has been served, so unlike voids they don't put stock back.
app.patch('/api/orders/:id/decide-refund', async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body || {};
  const order = getState().orders.find((o) => o.id === id);
  if (!order) return serializeError(res, 404, 'Order not found');
  if (order.status !== 'RefundRequested') return serializeError(res, 409, 'Order has no pending refund request');
  const state = await setState((s) => ({
    ...s,
    orders: s.orders.map((o) => (o.id === id ? { ...o, status: approve ? 'Refunded' : 'Paid' } : o)),
  }));
  res.json(state.orders.find((o) => o.id === id));
});

/* ---------------- Auth (demo — no password) ---------------- */

app.post('/api/login', (req, res) => {
  const { name, role } = req.body || {};
  if (!name || !String(name).trim()) return serializeError(res, 400, 'Name is required');
  if (!['customer', 'cashier', 'manager'].includes(role)) return serializeError(res, 400, 'Invalid role');
  res.json({ name: String(name).trim(), role });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Chakula Express API listening on http://localhost:${PORT}`);
});
