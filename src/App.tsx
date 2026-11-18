/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  ActiveCartSession,
  AdminBootstrapPayload,
  CartItem,
  Dish,
  DishInput,
  DishPatch,
  GuestBootstrapPayload,
  Order,
  OrderStatus,
  RealtimeEvent,
} from './shared/types';
import { getOrCreateSessionId, getTableFromUrl } from './utils/format';
import { GuestView, TopBar } from './components/TopBar';
import { MenuView } from './components/MenuView';
import { CartDrawer } from './components/CartDrawer';
import { GuestOrdersView } from './components/GuestOrdersView';
import { AdminPanel, AdminTab } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';

const ADMIN_TOKEN_KEY = 'sezon_admin_token';

function getPathState() {
  const pathname = window.location.pathname;
  const isAdmin = pathname.startsWith('/admin') || window.location.hash === '#admin';
  let initialAdminTab: AdminTab = 'tables';
  if (pathname.includes('/admin/menu')) initialAdminTab = 'menu';
  else if (pathname.includes('/admin/qr')) initialAdminTab = 'qr';
  else if (pathname.includes('/admin/orders')) initialAdminTab = 'orders';
  else if (pathname.includes('/admin/analytics')) initialAdminTab = 'analytics';
  return { isAdmin, initialAdminTab };
}

export default function App() {
  const [routeState, setRouteState] = useState(getPathState);

  const navigatePath = useCallback((targetPath: string) => {
    window.history.pushState({}, '', targetPath);
    setRouteState(getPathState());
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(getPathState());
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || (e.ctrlKey && e.shiftKey)) && e.code === 'KeyA') {
        e.preventDefault();
        navigatePath('/admin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigatePath]);

  if (routeState.isAdmin) {
    return (
      <AdminApp
        initialTab={routeState.initialAdminTab}
        onGoToGuestMenu={() => navigatePath('/')}
      />
    );
  }

  return <GuestApp onOpenAdmin={() => navigatePath('/admin')} />;
}

function GuestApp({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const assignedTable = useMemo(() => getTableFromUrl(), []);
  const sessionId = useMemo(() => getOrCreateSessionId(assignedTable), [assignedTable]);
  const [activeView, setActiveView] = useState<GuestView>('menu');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [menu, setMenu] = useState<Dish[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState(() =>
    assignedTable ? `Стол ${assignedTable}` : 'Стол 1'
  );
  const [customerName, setCustomerName] = useState('');

  const tableRef = useRef(tableNumber);
  tableRef.current = tableNumber;
  const nameRef = useRef(customerName);
  nameRef.current = customerName;
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;

  const fetchBootstrap = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch(`/api/bootstrap?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) {
        throw new Error('Не удалось загрузить меню');
      }
      const data = (await res.json()) as GuestBootstrapPayload;
      setMenu(data.menu);
      setMyOrders(data.myOrders);
      if (data.myCart) {
        setCartItems(data.myCart.items);
        if (data.myCart.tableNumber) setTableNumber(data.myCart.tableNumber);
        if (data.myCart.customerName) setCustomerName(data.myCart.customerName);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    const source = new EventSource(`/api/events?sessionId=${encodeURIComponent(sessionId)}`);

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        if (parsed.type === 'menu:updated') {
          setMenu(parsed.menu);
        } else if (parsed.type === 'carts:updated') {
          const mine = parsed.activeCarts.find((c) => c.sessionId === sessionId);
          setCartItems(mine ? mine.items : []);
        } else if (parsed.type === 'order:created') {
          if (parsed.order.sessionId === sessionId) {
            setMyOrders((prev) =>
              prev.some((o) => o.id === parsed.order.id) ? prev : [parsed.order, ...prev]
            );
          }
        } else if (parsed.type === 'order:updated') {
          if (parsed.order.sessionId === sessionId) {
            setMyOrders((prev) =>
              prev.map((o) => (o.id === parsed.order.id ? parsed.order : o))
            );
          }
        }
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    return () => {
      source.close();
    };
  }, [sessionId]);

  const syncCartToServer = useCallback(
    async (nextItems: CartItem[], nextTable?: string, nextName?: string) => {
      try {
        await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            items: nextItems,
            tableNumber: nextTable ?? tableRef.current,
            customerName: nextName ?? nameRef.current,
          }),
        });
      } catch {
        // Silent retry on next mutation
      }
    },
    [sessionId]
  );

  const handleUpdateQuantity = useCallback(
    (dish: Dish, nextQuantity: number) => {
      const clamped = Math.max(0, Math.min(50, nextQuantity));
      const prev = cartItemsRef.current;
      const existingIndex = prev.findIndex((i) => i.dishId === dish.id);
      let nextItems: CartItem[];

      if (clamped === 0) {
        nextItems = prev.filter((i) => i.dishId !== dish.id);
      } else if (existingIndex >= 0) {
        nextItems = prev.map((item) =>
          item.dishId === dish.id ? { ...item, quantity: clamped } : item
        );
      } else {
        nextItems = [
          ...prev,
          {
            dishId: dish.id,
            name: dish.name,
            price: dish.price,
            imageUrl: dish.imageUrl,
            quantity: clamped,
          },
        ];
      }

      setCartItems(nextItems);
      syncCartToServer(nextItems);
    },
    [syncCartToServer]
  );

  const handleChangeTable = useCallback(
    (nextTable: string) => {
      setTableNumber(nextTable);
      if (cartItemsRef.current.length > 0) {
        syncCartToServer(cartItemsRef.current, nextTable, nameRef.current);
      }
    },
    [syncCartToServer]
  );

  const handleChangeCustomerName = useCallback(
    (nextName: string) => {
      setCustomerName(nextName);
      if (cartItemsRef.current.length > 0) {
        syncCartToServer(cartItemsRef.current, tableRef.current, nextName);
      }
    },
    [syncCartToServer]
  );

  const handleSubmitOrder = useCallback(
    async (comment: string): Promise<Order> => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tableNumber: tableRef.current,
          customerName: nameRef.current,
          comment,
          items: cartItemsRef.current,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось оформить заказ');
      }

      const created = data as Order;
      setCartItems([]);
      setMyOrders((prev) => (prev.some((o) => o.id === created.id) ? prev : [created, ...prev]));
      return created;
    },
    [sessionId]
  );

  const handleNavigate = (view: GuestView, sectionId?: string) => {
    setActiveView(view);
    if (view === 'menu' && sectionId) {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#141413]">
      <TopBar
        activeView={activeView}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        cartTotal={cartTotal}
        assignedTable={assignedTable}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-stone-200 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-stone-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-stone-200 rounded w-1/2" />
                    <div className="h-5 bg-stone-200 rounded w-3/4" />
                    <div className="h-4 bg-stone-200 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : loadError ? (
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <div className="bg-white border border-stone-200 rounded-xl p-8">
              <p className="text-base font-medium text-[#141413]">{loadError}</p>
              <button
                type="button"
                onClick={fetchBootstrap}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#1B4332] rounded-lg cursor-pointer"
              >
                Повторить загрузку
              </button>
            </div>
          </div>
        ) : activeView === 'menu' ? (
          <MenuView
            menu={menu}
            cartItems={cartItems}
            assignedTable={assignedTable}
            onUpdateQuantity={handleUpdateQuantity}
            onOpenCart={() => setIsCartOpen(true)}
          />
        ) : (
          <GuestOrdersView
            orders={myOrders}
            onGoToMenu={() => handleNavigate('menu', 'menu-catalog')}
          />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <span>Сезон · Ежедневно с 09:00 до 23:00</span>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate('menu', 'menu-catalog')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Меню
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('orders')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Мои заказы
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              aria-label="Служебный вход"
              title="Служебный вход"
              className="p-1 text-stone-300 hover:text-stone-500 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </footer>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        menu={menu}
        tableNumber={tableNumber}
        assignedTable={assignedTable}
        customerName={customerName}
        onChangeTable={handleChangeTable}
        onChangeCustomerName={handleChangeCustomerName}
        onUpdateQuantity={handleUpdateQuantity}
        onSubmitOrder={handleSubmitOrder}
        onGoToOrders={() => handleNavigate('orders')}
      />
    </div>
  );
}

function AdminApp({
  initialTab,
  onGoToGuestMenu,
}: {
  initialTab: AdminTab;
  onGoToGuestMenu: () => void;
}) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(token));
  const [menu, setMenu] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeCarts, setActiveCarts] = useState<ActiveCartSession[]>([]);

  const handleAuthenticated = useCallback((nextToken: string) => {
    try {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, nextToken);
    } catch {
      // Ignore storage failures
    }
    setToken(nextToken);
    setLoading(true);
  }, []);

  const handleLogout = useCallback(async () => {
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      // Ignore storage failures
    }
    setToken(null);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/bootstrap', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          if (!cancelled) handleLogout();
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as AdminBootstrapPayload;
          if (!cancelled) {
            setMenu(data.menu);
            setOrders(data.orders);
            setActiveCarts(data.activeCarts);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, handleLogout]);

  useEffect(() => {
    if (!token) return;
    const source = new EventSource(`/api/events?adminToken=${encodeURIComponent(token)}`);

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        if (parsed.type === 'menu:updated') {
          setMenu(parsed.menu);
        } else if (parsed.type === 'carts:updated') {
          setActiveCarts(parsed.activeCarts);
        } else if (parsed.type === 'order:created') {
          setOrders((prev) =>
            prev.some((o) => o.id === parsed.order.id) ? prev : [parsed.order, ...prev]
          );
        } else if (parsed.type === 'order:updated') {
          setOrders((prev) =>
            prev.map((o) => (o.id === parsed.order.id ? parsed.order : o))
          );
        }
      } catch {
        // Ignore malformed SSE frames
      }
    };

    return () => {
      source.close();
    };
  }, [token]);

  const handleUpdateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!token) return;
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const updated = (await res.json()) as Order;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    },
    [token, handleLogout]
  );

  const handleUploadImage = useCallback(
    async (dataUrl: string): Promise<string> => {
      if (!token) throw new Error('Требуется авторизация');
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось загрузить фото');
      }
      return data.imageUrl;
    },
    [token]
  );

  const handleAddDish = useCallback(
    async (payload: DishInput) => {
      if (!token) return;
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка добавления блюда');
      }
    },
    [token, handleLogout]
  );

  const handleUpdateDish = useCallback(
    async (dishId: string, patch: DishPatch) => {
      if (!token) return;
      const res = await fetch(`/api/menu/${encodeURIComponent(dishId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка обновления блюда');
      }
    },
    [token, handleLogout]
  );

  const handleDeleteDish = useCallback(
    async (dishId: string) => {
      if (!token) return;
      const res = await fetch(`/api/menu/${encodeURIComponent(dishId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleLogout();
      }
    },
    [token, handleLogout]
  );

  if (!token) {
    return <AdminLogin onSuccess={handleAuthenticated} onBackToGuest={onGoToGuestMenu} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center text-sm text-stone-600">
        Загрузка панели администратора...
      </div>
    );
  }

  return (
    <AdminPanel
      orders={orders}
      activeCarts={activeCarts}
      menu={menu}
      initialTab={initialTab}
      onUpdateOrderStatus={handleUpdateOrderStatus}
      onUploadImage={handleUploadImage}
      onAddDish={handleAddDish}
      onUpdateDish={handleUpdateDish}
      onDeleteDish={handleDeleteDish}
      onLogout={handleLogout}
      onGoToGuestMenu={onGoToGuestMenu}
    />
  );
}
