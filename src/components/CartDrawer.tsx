import { useEffect, useState } from 'react';
import { X, Minus, Plus, Trash2, CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem, Dish, Order } from '../shared/types';
import { TABLE_NAMES, formatPrice } from '../utils/format';
import { DishImage } from './DishImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  menu: Dish[];
  tableNumber: string;
  assignedTable?: number | null;
  customerName: string;
  onChangeTable: (table: string) => void;
  onChangeCustomerName: (name: string) => void;
  onUpdateQuantity: (dish: Dish, nextQuantity: number) => void;
  onSubmitOrder: (comment: string) => Promise<Order>;
  onGoToOrders: () => void;
}

const TABLE_OPTIONS = [...TABLE_NAMES, 'С собой'];

export function CartDrawer({
  isOpen,
  onClose,
  items,
  menu,
  tableNumber,
  assignedTable,
  customerName,
  onChangeTable,
  onChangeCustomerName,
  onUpdateQuantity,
  onSubmitOrder,
  onGoToOrders,
}: CartDrawerProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (items.length > 0 && confirmedOrder) {
      setConfirmedOrder(null);
    }
  }, [items.length, confirmedOrder]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleOrderClick = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const order = await onSubmitOrder(comment);
      setConfirmedOrder(order);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заказ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Корзина заказа"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet on Mobile / Slide-over Drawer on Desktop */}
      <div className="relative z-10 w-full md:max-w-md bg-white max-h-[90dvh] md:max-h-none md:h-full rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-stone-200 flex flex-col">
        {/* Mobile drag handle */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 bg-stone-300 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 sm:px-6 py-3.5 md:py-4 border-b border-stone-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#141413]">Корзина</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {confirmedOrder
                ? `Заказ №${confirmedOrder.orderNumber} принят`
                : totalCount > 0
                  ? `Выбрано позиций: ${totalCount}`
                  : 'Выберите блюда из меню'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть корзину"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-[#141413] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {confirmedOrder ? (
            <div className="py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-semibold text-emerald-950">
                      Заказ №{confirmedOrder.orderNumber} отправлен администратору
                    </h3>
                    <p className="text-sm text-emerald-800 mt-1">
                      {confirmedOrder.tableNumber}
                      {confirmedOrder.customerName ? ` · ${confirmedOrder.customerName}` : ''} —
                      статус можно отслеживать в разделе «Заказы».
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-medium text-stone-500">Состав заказа</div>
                {confirmedOrder.items.map((item) => (
                  <div
                    key={item.dishId}
                    className="flex items-center justify-between text-sm gap-3"
                  >
                    <span className="text-[#141413]">
                      {item.name}{' '}
                      <span className="text-stone-500 tabular-nums">× {item.quantity}</span>
                    </span>
                    <span className="font-medium text-[#141413] tabular-nums shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-sm font-semibold">
                  <span>Итого</span>
                  <span className="tabular-nums">{formatPrice(confirmedOrder.totalAmount)}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedOrder(null);
                    onClose();
                    onGoToOrders();
                  }}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors cursor-pointer"
                >
                  <span>Отследить статус заказа</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedOrder(null);
                    onClose();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Вернуться в меню
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
                <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="text-base font-medium text-[#141413]">Корзина пуста</p>
              <p className="text-sm text-stone-500 mt-1 max-w-xs">
                Выберите блюда в меню — сначала они появятся здесь, а затем вы сможете отправить
                готовый заказ администратору.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-[44px] px-5 py-2.5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors cursor-pointer"
              >
                Перейти к меню
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#F8F8F6] border border-stone-200 rounded-lg px-3.5 py-2.5 text-xs text-stone-600 leading-relaxed">
                Ваш предварительный выбор уже зафиксирован в системе. Проверьте блюда и нажмите{' '}
                <span className="font-semibold text-[#141413]">«Заказать»</span> для отправки
                администратору.
              </div>

              {/* Cart Items */}
              <div className="divide-y divide-stone-200">
                {items.map((item) => {
                  const dishObj = menu.find((d) => d.id === item.dishId) || {
                    id: item.dishId,
                    name: item.name,
                    price: item.price,
                    imageUrl: item.imageUrl,
                    category: 'Горячие блюда',
                    description: '',
                    weight: '',
                    prepMinutes: 15,
                    available: true,
                  };

                  return (
                    <div key={item.dishId} className="py-4 first:pt-0 flex gap-3.5">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                        <DishImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-[#141413] leading-snug">
                            {item.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(dishObj, 0)}
                            aria-label={`Удалить ${item.name}`}
                            className="min-h-[36px] min-w-[36px] -mr-1.5 -mt-1 flex items-center justify-center text-stone-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center border border-stone-200 rounded-lg bg-[#F8F8F6]">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(dishObj, item.quantity - 1)}
                              aria-label="Уменьшить количество"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-700 hover:bg-stone-200/60 rounded-l-lg cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-sm font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(dishObj, item.quantity + 1)}
                              aria-label="Увеличить количество"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-700 hover:bg-stone-200/60 rounded-r-lg cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-semibold text-[#141413] tabular-nums">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Details Form (16px font on mobile to prevent iOS zoom) */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div>
                  <label
                    htmlFor="cart-table-select"
                    className="block text-xs font-medium text-stone-700 mb-1.5"
                  >
                    {assignedTable
                      ? `Столик (определён по QR-коду: Стол ${assignedTable})`
                      : 'Столик или получение'}
                  </label>
                  <select
                    id="cart-table-select"
                    value={tableNumber}
                    onChange={(e) => onChangeTable(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
                  >
                    {TABLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cart-customer-name"
                    className="block text-xs font-medium text-stone-700 mb-1.5"
                  >
                    Ваше имя (необязательно)
                  </label>
                  <input
                    id="cart-customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => onChangeCustomerName(e.target.value)}
                    placeholder="Например, Анна"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-stone-200 rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cart-order-comment"
                    className="block text-xs font-medium text-stone-700 mb-1.5"
                  >
                    Комментарий для кухни
                  </label>
                  <textarea
                    id="cart-order-comment"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Пожелания по подаче или аллергии..."
                    className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-stone-200 rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332] resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer */}
        {!confirmedOrder && items.length > 0 && (
          <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-200 bg-white shrink-0">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-stone-600">Итого к заказу</span>
              <span className="text-lg font-semibold text-[#141413] tabular-nums">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleOrderClick}
              className="w-full min-h-[48px] py-3 px-4 text-sm font-medium text-white bg-[#1B4332] active:bg-[#143326] hover:bg-[#143326] disabled:opacity-60 rounded-xl md:rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Отправляем заказ...' : `Заказать · ${formatPrice(totalAmount)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
