const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (e) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (name, role) => request('/login', { method: 'POST', body: JSON.stringify({ name, role }) }),

  getMenu: () => request('/menu'),
  addMenuItem: (item) => request('/menu', { method: 'POST', body: JSON.stringify(item) }),
  updateMenuItem: (id, item) => request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  toggleMenuAvailable: (id) => request(`/menu/${id}/toggle-available`, { method: 'PATCH' }),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }),

  getOrders: (customerName) => request(`/orders${customerName ? `?customerName=${encodeURIComponent(customerName)}` : ''}`),
  placeOrder: (customerName, lines, paymentMethod) =>
    request('/orders', { method: 'POST', body: JSON.stringify({ customerName, lines, paymentMethod }) }),
  advanceOrder: (id) => request(`/orders/${id}/advance`, { method: 'PATCH' }),
  voidOrder: (id, reason) => request(`/orders/${id}/void`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  requestRefund: (id, reason) => request(`/orders/${id}/request-refund`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  decideRefund: (id, approve) => request(`/orders/${id}/decide-refund`, { method: 'PATCH', body: JSON.stringify({ approve }) }),
};
