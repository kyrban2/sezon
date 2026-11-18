import { useMemo, useState } from 'react';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  PackageCheck,
  XCircle,
  Plus,
  Search,
  ShoppingBasket,
  Pencil,
  Trash2,
  LogOut,
  QrCode,
} from 'lucide-react';
import {
  ActiveCartSession,
  Dish,
  DishInput,
  DishPatch,
  Order,
  OrderStatus,
} from '../shared/types';
import { ORDER_STATUS_META, TABLE_NAMES, formatPrice, formatTime } from '../utils/format';
import { DishImage } from './DishImage';
import { DishEditorModal } from './DishEditorModal';
import { AdminQrCodes } from './AdminQrCodes';
import { AdminAnalytics } from './AdminAnalytics';

export type AdminTab = 'tables' | 'orders' | 'carts' | 'analytics' | 'menu' | 'qr';

interface AdminPanelProps {
  orders: Order[];
  activeCarts: ActiveCartSession[];
  menu: Dish[];
  initialTab?: AdminTab;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onUploadImage: (dataUrl: string) => Promise<string>;
  onAddDish: (payload: DishInput) => Promise<void>;
  onUpdateDish: (dishId: string, patch: DishPatch) => Promise<void>;
  onDeleteDish: (dishId: string) => Promise<void>;
  onLogout: () => void;
  onGoToGuestMenu?: () => void;
}

type OrderFilter = 'all' | OrderStatus;

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'new':
      return <Clock className="w-3.5 h-3.5 shrink-0" />;
    case 'preparing':
      return <ChefHat className="w-3.5 h-3.5 shrink-0" />;
    case 'ready':
      return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
    case 'completed':
      return <PackageCheck className="w-3.5 h-3.5 shrink-0" />;
    case 'cancelled':
      return <XCircle className="w-3.5 h-3.5 shrink-0" />;
  }
}

export function AdminPanel({
  orders,
  activeCarts,
  menu,
  initialTab = 'tables',
  onUpdateOrderStatus,
  onUploadImage,
  onAddDish,
  onUpdateDish,
  onDeleteDish,
  onLogout,
  onGoToGuestMenu,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const newCount = orders.filter((o) => o.status === 'new').length;
    const preparingCount = orders.filter((o) => o.status === 'preparing').length;
    const readyCount = orders.filter((o) => o.status === 'ready').length;
    const activeRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return { newCount, preparingCount, readyCount, activeRevenue };
  }, [orders]);

  // Group active orders and carts per table (Стол 1..10 + С собой)
  const tableCards = useMemo(() => {
    const tableOrderFilter = (order: Order) =>
      order.status === 'new' || order.status === 'preparing' || order.status === 'ready';

    const list = TABLE_NAMES.map((tableName) => {
      const tableActiveOrders = orders.filter(
        (o) => o.tableNumber === tableName && tableOrderFilter(o)
      );
      const tableCompletedCount = orders.filter(
        (o) => o.tableNumber === tableName && o.status === 'completed'
      ).length;
      const tableCarts = activeCarts.filter((c) => c.tableNumber === tableName);
      const activeTotal = tableActiveOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        tableName,
        activeOrders: tableActiveOrders,
        completedCount: tableCompletedCount,
        carts: tableCarts,
        activeTotal,
      };
    });

    const takeawayOrders = orders.filter(
      (o) => !TABLE_NAMES.includes(o.tableNumber) && tableOrderFilter(o)
    );
    const takeawayCarts = activeCarts.filter((c) => !TABLE_NAMES.includes(c.tableNumber));

    return { tables: list, takeawayOrders, takeawayCarts };
  }, [orders, activeCarts]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = orderFilter === 'all' || order.status === orderFilter;
      const matchesSearch =
        !q ||
        String(order.orderNumber).includes(q) ||
        order.tableNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.items.some((i) => i.name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, orderFilter, orderSearch]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setBusyOrderId(orderId);
    try {
      await onUpdateOrderStatus(orderId, nextStatus);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSaveDish = async (payload: DishInput, dishId?: string) => {
    if (dishId) {
      await onUpdateDish(dishId, payload);
    } else {
      await onAddDish(payload);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#141413]">
      {/* Dedicated Admin Header (non-sticky on mobile to preserve screen real estate) */}
      <header className="no-print md:sticky md:top-0 z-30 bg-[#F8F8F6]/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              if (onGoToGuestMenu) {
                onGoToGuestMenu();
              } else {
                window.location.href = '/';
              }
            }}
            className="font-display text-2xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Сезон
          </button>

          <nav
            aria-label="Разделы администратора"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600"
          >
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'tables'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Столы (1–10)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 tabular-nums ${
                activeTab === 'orders'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Заказы · {orders.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('carts')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 tabular-nums ${
                activeTab === 'carts'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Корзины · {activeCarts.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'analytics'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Аналитика
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 tabular-nums ${
                activeTab === 'menu'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Меню · {menu.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'qr'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              QR-коды
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#141413] bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Mobile Admin Tabs */}
        <div className="md:hidden border-t border-stone-200 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`min-h-[40px] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'tables' ? 'bg-stone-200/70 text-[#141413]' : 'text-stone-600'
            }`}
          >
            Столы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`min-h-[40px] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
              activeTab === 'orders' ? 'bg-stone-200/70 text-[#141413]' : 'text-stone-600'
            }`}
          >
            Заказы ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('carts')}
            className={`min-h-[40px] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
              activeTab === 'carts' ? 'bg-stone-200/70 text-[#141413]' : 'text-stone-600'
            }`}
          >
            Корзины ({activeCarts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`min-h-[40px] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'analytics' ? 'bg-stone-200/70 text-[#141413]' : 'text-stone-600'
            }`}
          >
            Аналитика
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`min-h-[40px] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
              activeTab === 'menu' ? 'bg-stone-200/70 text-[#141413]' : 'text-stone-600'
            }`}
          >
            Меню ({menu.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`min-h-[40px] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'qr' ? 'bg-stone-200/70 text-[#141413]' : 'text-stone-600'
            }`}
          >
            QR-коды
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Page Heading */}
        <div className="no-print pb-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#141413]">
              Панель администратора
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Заказы по каждому из 10 столов, активные корзины гостей, QR-коды и меню
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {activeTab !== 'qr' && (
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#141413] bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>QR-коды столов</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onGoToGuestMenu) {
                  onGoToGuestMenu();
                } else {
                  window.location.href = '/';
                }
              }}
              className="px-3.5 py-2 text-sm font-medium text-stone-600 hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Открыть сайт меню
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="no-print mt-6 grid grid-cols-2 lg:grid-cols-4 bg-white border border-stone-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
          <div className="p-5">
            <p className="text-xs font-medium text-stone-500">Новые заказы</p>
            <p className="text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
              {metrics.newCount}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-stone-500">Готовятся на кухне</p>
            <p className="text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
              {metrics.preparingCount}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-stone-500">Готовы к выдаче</p>
            <p className="text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
              {metrics.readyCount}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-stone-500">Выручка смены</p>
            <p className="text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
              {formatPrice(metrics.activeRevenue)}
            </p>
          </div>
        </div>

        {/* TAB 0: 10 TABLES FLOOR BOARD */}
        {activeTab === 'tables' && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tableCards.tables.map((table) => {
                const hasActivity = table.activeOrders.length > 0 || table.carts.length > 0;
                return (
                  <article
                    key={table.tableName}
                    className={`bg-white border rounded-xl p-5 flex flex-col justify-between ${
                      table.activeOrders.some((o) => o.status === 'new')
                        ? 'border-amber-300'
                        : 'border-stone-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200">
                        <div className="flex items-center gap-2.5">
                          <h2 className="font-display text-xl font-semibold text-[#141413]">
                            {table.tableName}
                          </h2>
                          {table.completedCount > 0 && (
                            <span className="text-xs text-stone-500 tabular-nums">
                              · Выдано: {table.completedCount}
                            </span>
                          )}
                        </div>
                        {table.activeTotal > 0 ? (
                          <span className="text-sm font-semibold text-[#141413] tabular-nums">
                            {formatPrice(table.activeTotal)}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">
                            {hasActivity ? 'В процессе выбора' : 'Свободен'}
                          </span>
                        )}
                      </div>

                      {/* Active Cart Selection on this table */}
                      {table.carts.map((cart) => (
                        <div
                          key={cart.sessionId}
                          className="mt-3 p-3 bg-[#F8F8F6] border border-stone-200 rounded-lg space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-amber-800">
                              Выбирает в корзине (не заказано)
                            </span>
                            <span className="text-stone-500 tabular-nums">
                              {formatTime(cart.updatedAt)}
                            </span>
                          </div>
                          {cart.items.map((item) => (
                            <div
                              key={item.dishId}
                              className="flex items-center justify-between text-xs text-stone-700 gap-2"
                            >
                              <span>
                                {item.name}{' '}
                                <span className="text-stone-500 tabular-nums">
                                  × {item.quantity}
                                </span>
                              </span>
                              <span className="tabular-nums shrink-0">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Confirmed Active Orders for this table */}
                      {table.activeOrders.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {table.activeOrders.map((order) => {
                            const meta = ORDER_STATUS_META[order.status];
                            const isBusy = busyOrderId === order.id;

                            return (
                              <div
                                key={order.id}
                                className="pt-3 first:pt-0 border-t first:border-t-0 border-stone-100 space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-mono font-semibold text-[#141413] tabular-nums">
                                      №{order.orderNumber}
                                    </span>
                                    {order.customerName && (
                                      <span className="text-stone-600">
                                        · {order.customerName}
                                      </span>
                                    )}
                                    <span className="text-stone-400 tabular-nums">
                                      · {formatTime(order.createdAt)}
                                    </span>
                                  </div>

                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                                  >
                                    <StatusIcon status={order.status} />
                                    <span>{meta.label}</span>
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {order.items.map((item) => (
                                    <div
                                      key={item.dishId}
                                      className="flex items-center justify-between text-sm gap-3"
                                    >
                                      <span className="text-[#141413]">
                                        {item.name}{' '}
                                        <span className="text-stone-500 tabular-nums">
                                          × {item.quantity}
                                        </span>
                                      </span>
                                      <span className="text-stone-700 font-medium tabular-nums shrink-0">
                                        {formatPrice(item.price * item.quantity)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {order.comment && (
                                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                                    Комментарий: {order.comment}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {order.status === 'new' && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleStatusChange(order.id, 'preparing')}
                                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                                    >
                                      Принять на кухню
                                    </button>
                                  )}
                                  {order.status === 'preparing' && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleStatusChange(order.id, 'ready')}
                                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                                    >
                                      Готов к выдаче
                                    </button>
                                  )}
                                  {order.status === 'ready' && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleStatusChange(order.id, 'completed')}
                                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#141413] hover:bg-stone-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                                    >
                                      Выдан гостю
                                    </button>
                                  )}
                                  {(order.status === 'new' || order.status === 'preparing') && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleStatusChange(order.id, 'cancelled')}
                                      className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                    >
                                      Отменить
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        !table.carts.length && (
                          <p className="text-xs text-stone-400 py-5">
                            Активных заказов для этого стола сейчас нет
                          </p>
                        )
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Takeaway orders section if present */}
            {(tableCards.takeawayOrders.length > 0 || tableCards.takeawayCarts.length > 0) && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <h2 className="font-display text-xl font-semibold text-[#141413]">
                  Заказы с собой
                </h2>
                <div className="space-y-3">
                  {tableCards.takeawayOrders.map((order) => {
                    const meta = ORDER_STATUS_META[order.status];
                    const isBusy = busyOrderId === order.id;
                    return (
                      <div
                        key={order.id}
                        className="pt-3 first:pt-0 border-t first:border-t-0 border-stone-200 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-semibold tabular-nums">
                              №{order.orderNumber}
                            </span>
                            {order.customerName && (
                              <span className="text-stone-600">· {order.customerName}</span>
                            )}
                            <span className="text-stone-400 text-xs tabular-nums">
                              · {formatTime(order.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-1">
                            {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatPrice(order.totalAmount)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                          >
                            <StatusIcon status={order.status} />
                            <span>{meta.label}</span>
                          </span>
                          {order.status === 'new' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(order.id, 'preparing')}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#1B4332] rounded-md cursor-pointer"
                            >
                              Принять
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(order.id, 'ready')}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#1B4332] rounded-md cursor-pointer"
                            >
                              Готов
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#141413] rounded-md cursor-pointer"
                            >
                              Выдан
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: ORDERS STREAM */}
        {activeTab === 'orders' && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'all', label: 'Все' },
                    { id: 'new', label: 'Новые' },
                    { id: 'preparing', label: 'Готовятся' },
                    { id: 'ready', label: 'Готовы' },
                    { id: 'completed', label: 'Выданы' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderFilter(tab.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      orderFilter === tab.id
                        ? 'bg-[#141413] text-white'
                        : 'bg-white text-stone-600 border border-stone-200 hover:text-[#141413]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Номер, столик или блюдо..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
                <p className="text-base font-medium text-[#141413]">Заказов в этой категории нет</p>
                <p className="text-sm text-stone-500 mt-1">
                  Новые заказы появятся здесь сразу после того, как гость нажмёт «Заказать» в
                  корзине.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const meta = ORDER_STATUS_META[order.status];
                  const isBusy = busyOrderId === order.id;

                  return (
                    <article
                      key={order.id}
                      className="bg-white border border-stone-200 rounded-xl p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-base font-semibold text-[#141413] tabular-nums">
                            №{order.orderNumber}
                          </span>
                          <span className="text-stone-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-sm font-semibold text-[#141413]">
                            {order.tableNumber}
                          </span>
                          {order.customerName && (
                            <>
                              <span className="text-stone-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-sm text-stone-600">{order.customerName}</span>
                            </>
                          )}
                          <span className="text-stone-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs text-stone-500 tabular-nums">
                            {formatTime(order.createdAt)}
                          </span>
                        </div>

                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                        >
                          <StatusIcon status={order.status} />
                          <span>{meta.label}</span>
                        </div>
                      </div>

                      <div className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-7 space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={item.dishId}
                              className="flex items-center justify-between text-sm gap-4"
                            >
                              <span className="text-[#141413]">
                                {item.name}{' '}
                                <span className="text-stone-500 tabular-nums">
                                  × {item.quantity}
                                </span>
                              </span>
                              <span className="font-medium text-stone-700 tabular-nums shrink-0">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          {order.comment && (
                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                              Комментарий гостя: {order.comment}
                            </p>
                          )}
                        </div>

                        <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between gap-3 pt-2 lg:pt-0">
                          <div className="text-left lg:text-right">
                            <span className="text-xs text-stone-500 block">Сумма заказа</span>
                            <span className="text-lg font-semibold text-[#141413] tabular-nums">
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {order.status === 'new' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleStatusChange(order.id, 'preparing')}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Принять на кухню
                              </button>
                            )}

                            {order.status === 'preparing' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleStatusChange(order.id, 'ready')}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Отметить готовым
                              </button>
                            )}

                            {order.status === 'ready' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleStatusChange(order.id, 'completed')}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#141413] hover:bg-stone-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Выдан гостю
                              </button>
                            )}

                            {(order.status === 'new' || order.status === 'preparing') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleStatusChange(order.id, 'cancelled')}
                                className="px-3 py-2 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Отменить
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE GUEST CARTS */}
        {activeTab === 'carts' && (
          <div className="mt-8 space-y-5">
            <div className="bg-white border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
              Здесь отображаются блюда, которые гости прямо сейчас выбирают в корзину, ещё до
              нажатия кнопки «Заказать». После подтверждения корзина автоматически переходит в
              раздел «Столы» и «Заказы».
            </div>

            {activeCarts.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
                <ShoppingBasket
                  className="w-8 h-8 text-stone-300 mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-base font-medium text-[#141413]">Активных корзин сейчас нет</p>
                <p className="text-sm text-stone-500 mt-1">
                  Как только гость выберет любое блюдо в меню, его корзина появится в этом списке в
                  реальном времени.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeCarts.map((cart) => (
                  <article
                    key={cart.sessionId}
                    className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#141413]">
                            {cart.tableNumber}
                          </span>
                          {cart.customerName && (
                            <>
                              <span className="text-stone-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-sm text-stone-600">{cart.customerName}</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-stone-500 tabular-nums">
                          Обновлено в {formatTime(cart.updatedAt)}
                        </span>
                      </div>

                      <p className="text-xs text-amber-800 mt-3 mb-3 font-medium">
                        В процессе выбора · Ожидает нажатия «Заказать»
                      </p>

                      <div className="space-y-2">
                        {cart.items.map((item) => (
                          <div
                            key={item.dishId}
                            className="flex items-center justify-between text-sm gap-3"
                          >
                            <span className="text-[#141413]">
                              {item.name}{' '}
                              <span className="text-stone-500 tabular-nums">× {item.quantity}</span>
                            </span>
                            <span className="text-stone-700 tabular-nums shrink-0">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-[#141413]">
                      <span>Предварительная сумма</span>
                      <span className="tabular-nums">{formatPrice(cart.totalAmount)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-stone-600">
                Редактируйте фотографии, описания, цены и наличие блюд — изменения сразу видны
                гостям.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingDish(null);
                  setEditorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить блюдо</span>
              </button>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200">
              {menu.map((dish) => (
                <div
                  key={dish.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-24 aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                      <DishImage
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 mb-1">
                        <span>{dish.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{dish.weight}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{dish.prepMinutes} мин</span>
                        {dish.tag && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#1B4332] font-medium">{dish.tag}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-[#141413]">{dish.name}</h3>
                      <p className="text-sm text-stone-600 mt-0.5 line-clamp-2">
                        {dish.description || 'Описание не заполнено'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <span className="text-sm font-semibold text-[#141413] tabular-nums mr-1">
                      {formatPrice(dish.price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onUpdateDish(dish.id, { available: !dish.available })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        dish.available
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {dish.available ? 'В наличии' : 'Стоп-лист'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingDish(dish);
                        setEditorOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141413] bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>

                    {confirmDeleteId === dish.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteDish(dish.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                        >
                          Удалить
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(dish.id)}
                        aria-label={`Удалить ${dish.name}`}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ANALYTICS, FUNNEL & EXCEL EXPORT */}
        {activeTab === 'analytics' && (
          <AdminAnalytics orders={orders} activeCarts={activeCarts} />
        )}

        {/* TAB 5: TABLE QR CODES */}
        {activeTab === 'qr' && <AdminQrCodes />}
      </main>

      <DishEditorModal
        isOpen={editorOpen}
        dish={editingDish}
        onClose={() => setEditorOpen(false)}
        onUploadImage={onUploadImage}
        onSave={handleSaveDish}
      />
    </div>
  );
}
