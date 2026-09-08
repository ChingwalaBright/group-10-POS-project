import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UtensilsCrossed, ShoppingCart, ClipboardList, XCircle,
  RotateCcw, TrendingUp, Wallet, Plus, Minus, X, LogOut, Pencil, Trash2,
  AlertTriangle, Clock, Package, Flame, Bell
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from './api.js';

const C = {
  bg: '#F5F6F0',
  card: '#FFFFFF',
  primary: '#2F5233',
  primaryDark: '#233F27',
  primarySoft: '#E3EBE1',
  gold: '#C99A2E',
  goldSoft: '#F5E9CE',
  blue: '#2E6F8E',
  blueSoft: '#DDEAF0',
  ink: '#242820',
  muted: '#7C7A6C',
  border: '#E6E3D6',
  red: '#B23B2E',
  redSoft: '#F5E1DE',
  green: '#3F8F5F',
};

const CATEGORIES = ['Nshima', 'Fast Food', 'Vegetables', 'Coffee', 'Drinks', 'Bakery', 'Snacks', 'Ice-cream'];

function kw(n) { return `K${Number(n).toFixed(2)}`; }

const STATUS_STYLE = {
  Placed: { bg: C.goldSoft, color: '#8A6A16', label: 'Order placed' },
  Preparing: { bg: C.primarySoft, color: C.primaryDark, label: 'Preparing' },
  Ready: { bg: C.blueSoft, color: C.blue, label: 'Ready — pay at counter' },
  Paid: { bg: '#E1EFE6', color: C.green, label: 'Paid' },
  Voided: { bg: C.redSoft, color: C.red, label: 'Voided' },
  RefundRequested: { bg: C.redSoft, color: C.red, label: 'Refund requested' },
  Refunded: { bg: C.border, color: C.muted, label: 'Refunded' },
};

const NEXT_STATUS = { Placed: 'Preparing', Preparing: 'Ready', Ready: 'Paid' };
const NEXT_LABEL = { Placed: 'Start preparing', Preparing: 'Mark ready', Ready: 'Collect payment' };

const POLL_MS = 4000;
const USER_STORAGE_KEY = 'chakula-express-user';

export default function RestaurantSystem() {
  const [ready, setReady] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  });
  const [toast, setToast] = useState(null);

  const refreshAll = useCallback(async () => {
    const [m, o] = await Promise.all([api.getMenu(), api.getOrders()]);
    setMenuItems(m);
    setOrders(o);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshAll();
      } catch (e) {
        setToast(`Couldn't reach the server: ${e.message}`);
      }
      setReady(true);
    })();
  }, [refreshAll]);

  // Poll so multiple devices (customer phones, till, manager) stay in sync.
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => { refreshAll().catch(() => {}); }, POLL_MS);
    return () => clearInterval(t);
  }, [ready, refreshAll]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  function login(u) {
    setUser(u);
    try { localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u)); } catch (e) {}
  }
  function logout() {
    setUser(null);
    try { localStorage.removeItem(USER_STORAGE_KEY); } catch (e) {}
  }

  async function placeOrder(customerName, lines, paymentMethod) {
    try {
      await api.placeOrder(customerName, lines, paymentMethod);
      await refreshAll();
      setToast('Order sent to the kitchen');
      return true;
    } catch (e) {
      setToast(e.message);
      return false;
    }
  }

  async function advanceOrder(id) {
    try {
      await api.advanceOrder(id);
      await refreshAll();
      setToast('Order updated');
    } catch (e) {
      setToast(e.message);
    }
  }

  async function voidOrder(id, reason) {
    try {
      await api.voidOrder(id, reason);
      await refreshAll();
      setToast('Order voided, stock restored');
    } catch (e) {
      setToast(e.message);
    }
  }

  async function requestRefund(id, reason) {
    try {
      await api.requestRefund(id, reason);
      await refreshAll();
      setToast('Refund requested');
    } catch (e) {
      setToast(e.message);
    }
  }

  async function decideRefund(id, approve) {
    try {
      await api.decideRefund(id, approve);
      await refreshAll();
      setToast(approve ? 'Refund approved' : 'Refund denied');
    } catch (e) {
      setToast(e.message);
    }
  }

  async function addMenuItem(item) {
    try {
      await api.addMenuItem(item);
      await refreshAll();
    } catch (e) {
      setToast(e.message);
    }
  }
  async function updateMenuItem(id, item) {
    try {
      await api.updateMenuItem(id, item);
      await refreshAll();
    } catch (e) {
      setToast(e.message);
    }
  }
  async function toggleMenuAvailable(id) {
    try {
      await api.toggleMenuAvailable(id);
      await refreshAll();
    } catch (e) {
      setToast(e.message);
    }
  }
  async function deleteMenuItem(id) {
    try {
      await api.deleteMenuItem(id);
      await refreshAll();
    } catch (e) {
      setToast(e.message);
    }
  }

  if (!ready) {
    return (
      <div style={{ background: C.bg, minHeight: 480 }} className="flex items-center justify-center rounded-2xl">
        <div style={{ color: C.muted }} className="text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, fontFamily: "'Work Sans', system-ui, sans-serif", color: C.ink }} className="w-full rounded-2xl overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap');
        .rs-display { font-family: 'Fraunces', Georgia, serif; }
        .rs-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .rs-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 8px; }
      `}</style>

      {!user ? (
        <LoginScreen onLogin={login} />
      ) : user.role === 'customer' ? (
        <CustomerApp
          user={user} onLogout={logout}
          menuItems={menuItems} orders={orders.filter((o) => o.customerName === user.name)}
          placeOrder={placeOrder} requestRefund={requestRefund}
        />
      ) : user.role === 'cashier' ? (
        <CashierApp
          user={user} onLogout={logout}
          orders={orders} advanceOrder={advanceOrder}
        />
      ) : (
        <ManagerApp
          user={user} onLogout={logout}
          orders={orders} menuItems={menuItems}
          addMenuItem={addMenuItem} updateMenuItem={updateMenuItem}
          toggleMenuAvailable={toggleMenuAvailable} deleteMenuItem={deleteMenuItem}
          voidOrder={voidOrder} decideRefund={decideRefund}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white shadow-lg z-50" style={{ background: C.ink }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------- Login ---------------- */

function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const u = await api.login(name.trim(), role);
      onLogin(u);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center p-8" style={{ minHeight: 560 }}>
      <div className="w-full max-w-sm p-7 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed size={20} color={C.primary} />
          <span className="rs-display text-xl font-semibold">Chakula Express</span>
        </div>
        <p style={{ color: C.muted }} className="text-sm mb-6">Sign in to continue — this is a demo login, no password needed.</p>

        <label className="block mb-4">
          <div style={{ color: C.muted }} className="text-xs mb-1">Your name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mutale Banda"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ border: `1px solid ${C.border}`, background: C.bg }}
          />
        </label>

        <div style={{ color: C.muted }} className="text-xs mb-2">Continue as</div>
        <div className="flex flex-col gap-2 mb-4">
          {[
            { id: 'customer', label: 'Customer', desc: 'Browse the menu and place orders' },
            { id: 'cashier', label: 'Cashier', desc: 'Move orders through prep and collect payment' },
            { id: 'manager', label: 'Manager', desc: 'Void orders, decide refunds, reports & menu' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className="text-left px-3 py-2.5 rounded-xl"
              style={{
                border: `1px solid ${role === r.id ? C.primary : C.border}`,
                background: role === r.id ? C.primarySoft : 'transparent',
              }}
            >
              <div className="text-sm font-medium">{r.label}</div>
              <div style={{ color: C.muted }} className="text-xs">{r.desc}</div>
            </button>
          ))}
        </div>

        {error && <div style={{ color: C.red }} className="text-xs mb-3">{error}</div>}

        <button
          disabled={!name.trim() || busy}
          onClick={submit}
          className="w-full py-3 rounded-full text-sm font-semibold text-white"
          style={{ background: name.trim() ? C.primary : C.border, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </div>
    </div>
  );
}

function Header({ title, user, onLogout, tabs, activeTab, setActiveTab }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={19} color={C.primary} />
          <span className="rs-display text-lg font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div style={{ color: C.muted }} className="text-xs capitalize leading-tight">{user.role}</div>
          </div>
          <button onClick={onLogout} className="p-2 rounded-full" style={{ border: `1px solid ${C.border}`, color: C.muted }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: activeTab === t.id ? C.primary : C.card,
              color: activeTab === t.id ? '#fff' : C.ink,
              border: `1px solid ${activeTab === t.id ? C.primary : C.border}`,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Placed;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium inline-block" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ---------------- Customer ---------------- */

function CustomerApp({ user, onLogout, menuItems, orders, placeOrder, requestRefund }) {
  const [tab, setTab] = useState('menu');
  const [activeCategory, setActiveCategory] = useState('Nshima');
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [sizeChoice, setSizeChoice] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const items = menuItems.filter((m) => m.category === activeCategory);

  function cartQtyFor(itemId) {
    return Object.values(cart).filter((l) => l.itemId === itemId).reduce((s, l) => s + l.qty, 0);
  }

  function lineKey(item, size) { return `${item.id}-${size || 'std'}`; }
  function addToCart(item) {
    if (item.stock <= 0 || !item.available) return;
    if (cartQtyFor(item.id) >= item.stock) { return; } // can't add more than what's actually in stock
    const size = item.hasSize ? (sizeChoice[item.id] || 'Small') : null;
    const key = lineKey(item, size);
    const unitPrice = item.price + (size === 'Large' ? 5 : 0);
    setCart((prev) => ({
      ...prev,
      [key]: { itemId: item.id, name: item.name, size, unitPrice, qty: (prev[key]?.qty || 0) + 1 },
    }));
  }
  function changeQty(key, delta) {
    setCart((prev) => {
      const line = prev[key];
      if (!line) return prev;
      const qty = Math.max(0, line.qty + delta);
      const next = { ...prev };
      if (qty === 0) delete next[key]; else next[key] = { ...line, qty };
      return next;
    });
  }

  const cartLines = Object.entries(cart).filter(([, l]) => l.qty > 0);
  const cartTotal = cartLines.reduce((s, [, l]) => s + l.unitPrice * l.qty, 0);
  const cartCount = cartLines.reduce((s, [, l]) => s + l.qty, 0);

  async function submitOrder() {
    if (cartLines.length === 0 || submitting) return;
    setSubmitting(true);
    const ok = await placeOrder(user.name, cartLines.map(([, l]) => l), paymentMethod);
    setSubmitting(false);
    if (ok) {
      setCart({});
      setShowCart(false);
      setTab('orders');
    }
  }

  return (
    <div>
      <Header
        title="Chakula Express" user={user} onLogout={onLogout}
        tabs={[
          { id: 'menu', label: 'Menu', icon: <UtensilsCrossed size={15} /> },
          { id: 'orders', label: 'My orders', icon: <ClipboardList size={15} /> },
        ]}
        activeTab={tab} setActiveTab={setTab}
      />

      <div className="px-5 pb-5 rs-scroll" style={{ maxHeight: 620, overflowY: 'auto' }}>
        {tab === 'menu' && (
          <div>
            <div className="flex gap-2 mb-5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: activeCategory === cat ? C.gold : C.card,
                    color: activeCategory === cat ? '#fff' : C.ink,
                    border: `1px solid ${activeCategory === cat ? C.gold : C.border}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-24">
              {items.map((item) => {
                const size = sizeChoice[item.id] || 'Small';
                const outOfStock = item.stock <= 0 || !item.available;
                const atMax = !outOfStock && cartQtyFor(item.id) >= item.stock;
                return (
                  <div key={item.id} className="p-4 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <div className="flex items-baseline justify-between mb-1">
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-sm font-semibold" style={{ color: C.primary }}>{kw(item.price)}</div>
                    </div>
                    {outOfStock ? (
                      <div style={{ color: C.red }} className="text-xs mb-2">Currently unavailable</div>
                    ) : (
                      <div style={{ color: C.muted }} className="text-xs mb-2">{item.stock} left today</div>
                    )}
                    {item.hasSize && !outOfStock && (
                      <div className="flex items-center gap-2 mb-2">
                        {['Small', 'Large'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSizeChoice((prev) => ({ ...prev, [item.id]: s }))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: size === s ? C.ink : 'transparent',
                              color: size === s ? '#fff' : C.muted,
                              border: `1px solid ${size === s ? C.ink : C.border}`,
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      disabled={outOfStock || atMax}
                      onClick={() => addToCart(item)}
                      className="w-full py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: (outOfStock || atMax) ? C.border : C.primarySoft,
                        color: (outOfStock || atMax) ? C.muted : C.primaryDark,
                        cursor: (outOfStock || atMax) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {outOfStock ? 'Sold out' : atMax ? 'Max in cart' : 'Add to order'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'orders' && <CustomerOrders orders={orders} requestRefund={requestRefund} />}
      </div>

      {tab === 'menu' && cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed left-1/2 -translate-x-1/2 bottom-6 px-6 py-3 rounded-full text-sm font-semibold text-white flex items-center gap-2 shadow-lg"
          style={{ background: C.primary }}
        >
          <ShoppingCart size={16} /> {cartCount} item{cartCount === 1 ? '' : 's'} · {kw(cartTotal)}
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-50" style={{ background: 'rgba(36,40,32,0.45)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="rs-display font-semibold text-base">Your order</span>
              <button onClick={() => setShowCart(false)} style={{ color: C.muted }}><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3 mb-4 rs-scroll" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {cartLines.map(([key, line]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{line.name}</div>
                    {line.size && <div style={{ color: C.muted }} className="text-xs">{line.size}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn onClick={() => changeQty(key, -1)}><Minus size={12} /></IconBtn>
                    <span className="w-4 text-center text-xs">{line.qty}</span>
                    <IconBtn onClick={() => changeQty(key, 1)}><Plus size={12} /></IconBtn>
                  </div>
                  <div className="text-sm font-semibold w-16 text-right">{kw(line.unitPrice * line.qty)}</div>
                </div>
              ))}
            </div>
            <div style={{ color: C.muted }} className="text-xs mb-2">Payment method (paid in person at the counter)</div>
            <div className="flex gap-2 mb-4">
              {['Cash', 'Mobile Money'].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className="flex-1 py-2 rounded-full text-xs font-medium"
                  style={{
                    background: paymentMethod === m ? C.ink : 'transparent',
                    color: paymentMethod === m ? '#fff' : C.muted,
                    border: `1px solid ${paymentMethod === m ? C.ink : C.border}`,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-4 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-semibold">{kw(cartTotal)}</span>
            </div>
            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full py-3 rounded-full text-sm font-semibold text-white"
              style={{ background: C.primary, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Sending…' : 'Send order to the kitchen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerOrders({ orders, requestRefund }) {
  const [refundingId, setRefundingId] = useState(null);
  const [reason, setReason] = useState('');

  if (orders.length === 0) {
    return <div style={{ color: C.muted }} className="text-sm py-10 text-center">You haven&apos;t placed any orders yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {orders.map((o) => (
        <div key={o.id} className="p-4 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Order #{o.number}</span>
            <StatusBadge status={o.status} />
          </div>
          <div style={{ color: C.muted }} className="text-xs mb-2">{new Date(o.createdAt).toLocaleString()} · {o.paymentMethod}</div>
          <div className="text-xs mb-2">
            {o.items.map((it, i) => (
              <div key={i}>{it.qty}× {it.name}{it.size ? ` (${it.size})` : ''}</div>
            ))}
          </div>
          <div className="text-sm font-semibold mb-2">{kw(o.total)}</div>
          {o.status === 'Voided' && o.voidReason && (
            <div style={{ color: C.muted }} className="text-xs italic mb-2">Voided: {o.voidReason}</div>
          )}
          {o.status === 'RefundRequested' && o.refundReason && (
            <div style={{ color: C.muted }} className="text-xs italic mb-2">Reason given: {o.refundReason}</div>
          )}
          {o.status === 'Paid' && refundingId !== o.id && (
            <button onClick={() => setRefundingId(o.id)} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ border: `1px solid ${C.border}`, color: C.red }}>
              Request refund
            </button>
          )}
          {refundingId === o.id && (
            <div className="mt-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for refund"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none mb-2"
                style={{ border: `1px solid ${C.border}` }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { requestRefund(o.id, reason || 'No reason given'); setRefundingId(null); setReason(''); }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ background: C.red }}
                >
                  Submit request
                </button>
                <button onClick={() => setRefundingId(null)} className="px-3 py-1.5 rounded-full text-xs" style={{ border: `1px solid ${C.border}` }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IconBtn({ children, onClick }) {
  return (
    <button onClick={onClick} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: `1px solid ${C.border}`, color: C.ink }}>
      {children}
    </button>
  );
}

/* ---------------- Cashier ---------------- */

function CashierApp({ user, onLogout, orders, advanceOrder }) {
  const [tab, setTab] = useState('active');
  const active = orders.filter((o) => ['Placed', 'Preparing', 'Ready'].includes(o.status));
  const today = new Date().toDateString();
  const paidToday = orders.filter((o) => o.status === 'Paid' && o.paidAt && new Date(o.paidAt).toDateString() === today);
  const totalToday = paidToday.reduce((s, o) => s + o.total, 0);

  const statusIcon = { Placed: <Clock size={14} />, Preparing: <Flame size={14} />, Ready: <Bell size={14} /> };

  return (
    <div>
      <Header
        title="Chakula Express — Till" user={user} onLogout={onLogout}
        tabs={[
          { id: 'active', label: `Active orders (${active.length})`, icon: <Wallet size={15} /> },
          { id: 'log', label: 'Today\u2019s log', icon: <ClipboardList size={15} /> },
        ]}
        activeTab={tab} setActiveTab={setTab}
      />
      <div className="px-5 pb-6 rs-scroll" style={{ maxHeight: 620, overflowY: 'auto' }}>
        {tab === 'active' && (
          active.length === 0 ? (
            <div style={{ color: C.muted }} className="text-sm py-10 text-center">No active orders right now.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map((o) => (
                <div key={o.id} className="p-4 rounded-2xl flex items-center gap-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.muted }}>{statusIcon[o.status]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">Order #{o.number} · {o.customerName}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ color: C.muted }} className="text-xs">{o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}</div>
                    <div style={{ color: C.muted }} className="text-xs mt-0.5">Pay by: {o.paymentMethod}</div>
                  </div>
                  <div className="text-sm font-semibold">{kw(o.total)}</div>
                  <button onClick={() => advanceOrder(o.id)} className="px-4 py-2 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ background: C.primary }}>
                    {NEXT_LABEL[o.status]}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
        {tab === 'log' && (
          <div>
            <div className="p-4 rounded-2xl mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.muted }} className="text-xs mb-1">Collected today</div>
              <div className="rs-display text-xl font-semibold">{kw(totalToday)}</div>
            </div>
            {paidToday.length === 0 ? (
              <div style={{ color: C.muted }} className="text-sm py-6 text-center">No payments recorded yet today.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {paidToday.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <div className="text-sm">Order #{o.number} · {o.customerName}</div>
                    <div className="text-sm font-medium">{kw(o.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Manager ---------------- */

function ManagerApp({ user, onLogout, orders, menuItems, addMenuItem, updateMenuItem, toggleMenuAvailable, deleteMenuItem, voidOrder, decideRefund }) {
  const [tab, setTab] = useState('active');
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const active = orders.filter((o) => ['Placed', 'Preparing', 'Ready'].includes(o.status));
  const refunds = orders.filter((o) => o.status === 'RefundRequested');

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'Paid');
    const refunded = orders.filter((o) => o.status === 'Refunded');
    const voided = orders.filter((o) => o.status === 'Voided');
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const refundedAmt = refunded.reduce((s, o) => s + o.total, 0);
    const tally = {};
    paid.forEach((o) => o.items.forEach((it) => { tally[it.name] = (tally[it.name] || 0) + it.qty; }));
    const topItems = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
    const byDay = {};
    paid.forEach((o) => {
      const key = new Date(o.paidAt || o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      byDay[key] = (byDay[key] || 0) + o.total;
    });
    const chartData = Object.entries(byDay).map(([day, revenue]) => ({ day, revenue: Number(revenue.toFixed(2)) }));
    return { revenue, refundedAmt, paidCount: paid.length, voidedCount: voided.length, topItems, chartData };
  }, [orders]);

  return (
    <div>
      <Header
        title="Chakula Express — Manager" user={user} onLogout={onLogout}
        tabs={[
          { id: 'active', label: `Active orders (${active.length})`, icon: <Clock size={15} /> },
          { id: 'refunds', label: `Refunds (${refunds.length})`, icon: <RotateCcw size={15} /> },
          { id: 'reports', label: 'Reports', icon: <TrendingUp size={15} /> },
          { id: 'menu', label: 'Menu', icon: <Package size={15} /> },
        ]}
        activeTab={tab} setActiveTab={setTab}
      />
      <div className="px-5 pb-6 rs-scroll" style={{ maxHeight: 620, overflowY: 'auto' }}>
        {tab === 'active' && (
          active.length === 0 ? (
            <div style={{ color: C.muted }} className="text-sm py-10 text-center">No active orders right now.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map((o) => (
                <div key={o.id} className="p-4 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Order #{o.number} · {o.customerName}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ color: C.muted }} className="text-xs mb-3">
                    {o.items.map((it) => `${it.qty}× ${it.name}${it.size ? ` (${it.size})` : ''}`).join(', ')} · {kw(o.total)}
                  </div>
                  {voidingId === o.id ? (
                    <div>
                      <input
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        placeholder="Reason for voiding"
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none mb-2"
                        style={{ border: `1px solid ${C.border}` }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { voidOrder(o.id, voidReason || 'No reason given'); setVoidingId(null); setVoidReason(''); }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                          style={{ background: C.red }}
                        >
                          Confirm void
                        </button>
                        <button onClick={() => setVoidingId(null)} className="px-3 py-1.5 rounded-full text-xs" style={{ border: `1px solid ${C.border}` }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setVoidingId(o.id)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold" style={{ border: `1px solid ${C.border}`, color: C.red }}>
                      <XCircle size={13} /> Void order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'refunds' && (
          refunds.length === 0 ? (
            <div style={{ color: C.muted }} className="text-sm py-10 text-center">No refund requests right now.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {refunds.map((o) => (
                <div key={o.id} className="p-4 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">Order #{o.number} · {o.customerName}</span>
                    <span className="text-sm font-semibold">{kw(o.total)}</span>
                  </div>
                  <div style={{ color: C.muted }} className="text-xs mb-3 flex items-center gap-1">
                    <AlertTriangle size={12} /> {o.refundReason}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => decideRefund(o.id, true)} className="px-4 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: C.red }}>
                      Approve refund
                    </button>
                    <button onClick={() => decideRefund(o.id, false)} className="px-4 py-1.5 rounded-full text-xs font-semibold" style={{ border: `1px solid ${C.border}` }}>
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'reports' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard label="Revenue" value={kw(stats.revenue)} />
              <StatCard label="Completed orders" value={String(stats.paidCount)} />
              <StatCard label="Refunded" value={kw(stats.refundedAmt)} />
              <StatCard label="Voided" value={String(stats.voidedCount)} />
            </div>
            <div className="p-4 rounded-2xl mb-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <h3 className="text-sm font-semibold mb-3">Revenue by day</h3>
              {stats.chartData.length === 0 ? (
                <div style={{ color: C.muted }} className="text-sm py-8 text-center">No completed sales yet.</div>
              ) : (
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: C.muted }} axisLine={{ stroke: C.border }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip formatter={(v) => kw(v)} contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                      <Bar dataKey="revenue" fill={C.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="p-4 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <h3 className="text-sm font-semibold mb-3">Top sellers</h3>
              {stats.topItems.length === 0 ? (
                <div style={{ color: C.muted }} className="text-sm py-4 text-center">No sales yet.</div>
              ) : (
                stats.topItems.map((it, i) => (
                  <div key={it.name} className="flex items-center gap-3 py-1">
                    <span style={{ color: C.muted }} className="text-xs w-4">{i + 1}</span>
                    <span className="flex-1 text-sm">{it.name}</span>
                    <span className="text-sm font-medium" style={{ color: C.primary }}>{it.qty} sold</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'menu' && (
          <ManagerMenu
            menuItems={menuItems}
            addMenuItem={addMenuItem}
            updateMenuItem={updateMenuItem}
            toggleMenuAvailable={toggleMenuAvailable}
            deleteMenuItem={deleteMenuItem}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
      <div className="rs-display text-lg font-semibold">{value}</div>
    </div>
  );
}

function ManagerMenu({ menuItems, addMenuItem, updateMenuItem, toggleMenuAvailable, deleteMenuItem }) {
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(null);

  function startAdd() {
    setDraft({ name: '', category: CATEGORIES[0], price: '', hasSize: false, stock: '', available: true });
    setAdding(true); setEditingId(null);
  }
  function startEdit(item) {
    setDraft({ ...item, price: String(item.price), stock: String(item.stock) });
    setEditingId(item.id); setAdding(false);
  }
  function cancel() { setDraft(null); setAdding(false); setEditingId(null); }
  async function save() {
    if (!draft || !draft.name.trim()) return;
    const clean = { ...draft, price: Number(draft.price) || 0, stock: Number(draft.stock) || 0 };
    if (adding) await addMenuItem(clean);
    else await updateMenuItem(clean.id, clean);
    cancel();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Menu &amp; stock</h3>
        <button onClick={startAdd} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: C.primary }}>
          <Plus size={13} /> Add item
        </button>
      </div>

      {draft && (
        <div className="p-4 rounded-2xl mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="pos-input" /></Field>
            <Field label="Category">
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="pos-input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price (K)"><input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="pos-input" /></Field>
            <Field label="Stock"><input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} className="pos-input" /></Field>
            <label className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={draft.hasSize} onChange={(e) => setDraft({ ...draft, hasSize: e.target.checked })} />
              <span className="text-xs" style={{ color: C.muted }}>Has size (Small/Large)</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: C.primary }}>Save item</button>
            <button onClick={cancel} className="px-4 py-2 rounded-full text-sm font-medium" style={{ border: `1px solid ${C.border}` }}>Cancel</button>
          </div>
          <style>{`.pos-input { width: 100%; padding: 8px 10px; border-radius: 10px; border: 1px solid ${C.border}; background: ${C.bg}; font-size: 13px; outline: none; }`}</style>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        {CATEGORIES.map((cat) => {
          const items = menuItems.filter((m) => m.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="px-4 py-2 text-xs font-semibold" style={{ background: C.primarySoft, color: C.primaryDark }}>{cat}</div>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${C.border}`, background: C.card }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.name}</div>
                    {!item.available && <div style={{ color: C.red }} className="text-xs">Marked unavailable</div>}
                  </div>
                  <div className="text-sm font-semibold w-16 text-right">{kw(item.price)}</div>
                  <div className="text-xs w-24 text-right" style={{ color: item.stock <= 5 ? C.red : C.muted }}>{item.stock} in stock</div>
                  <button onClick={() => toggleMenuAvailable(item.id)} className="text-xs px-2.5 py-1 rounded-full" style={{ border: `1px solid ${C.border}`, color: item.available ? C.green : C.red }}>
                    {item.available ? 'Available' : 'Sold out'}
                  </button>
                  <button onClick={() => startEdit(item)} className="p-2 rounded-full" style={{ color: C.muted }}><Pencil size={14} /></button>
                  <button onClick={() => deleteMenuItem(item.id)} className="p-2 rounded-full" style={{ color: C.red }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
      {children}
    </label>
  );
}
