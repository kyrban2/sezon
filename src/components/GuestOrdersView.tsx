import { Clock, ChefHat, CheckCircle2, PackageCheck, XCircle, ArrowRight } from 'lucide-react';
import { Order, OrderStatus } from '../shared/types';
import { ORDER_STATUS_META, formatPrice, formatTime } from '../utils/format';

interface GuestOrdersViewProps {
  orders: Order[];
  onGoToMenu: () => void;
}

const PROGRESS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'new', label: 'Новый' },
  { status: 'preparing', label: 'Готовится' },
  { status: 'ready', label: 'Готов' },
  { status: 'completed', label: 'Выдан' },
];

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'new':
      return <Clock className="w-4 h-4 shrink-0" />;
    case 'preparing':
      return <ChefHat className="w-4 h-4 shrink-0" />;
    case 'ready':
      return <CheckCircle2 className="w-4 h-4 shrink-0" />;
    case 'completed':
      return <PackageCheck className="w-4 h-4 shrink-0" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 shrink-0" />;
  }
}

export function GuestOrdersView({ orders, onGoToMenu }: GuestOrdersViewProps) {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#141413]">
            Мои заказы
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Статус обновляется в реальном времени по мере работы администратора и кухни
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToMenu}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B4332] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Добавить ещё блюда</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 bg-white border border-stone-200 rounded-2xl p-12 text-center">
          <p className="text-base font-medium text-[#141413]">
            У вас пока нет отправленных заказов
          </p>
          <p className="text-sm text-stone-500 mt-1.5 max-w-md mx-auto">
            Добавьте блюда в корзину и нажмите «Заказать», чтобы отправить заказ администратору.
          </p>
          <button
            type="button"
            onClick={onGoToMenu}
            className="mt-5 min-h-[44px] px-5 py-2.5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors cursor-pointer"
          >
            Открыть меню
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            const currentStepIndex = PROGRESS_STEPS.findIndex((s) => s.status === order.status);

            return (
              <article
                key={order.id}
                className="bg-white border border-stone-200 rounded-xl p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-stone-200">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base font-semibold text-[#141413] tabular-nums">
                        Заказ №{order.orderNumber}
                      </span>
                      <span className="text-stone-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-sm font-medium text-stone-700">
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
                    </div>
                    <p className="text-xs text-stone-500 mt-1 tabular-nums">
                      Отправлен в {formatTime(order.createdAt)} — {meta.description}
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                  >
                    <StatusIcon status={order.status} />
                    <span>{meta.label}</span>
                  </div>
                </div>

                {/* Live status step progression */}
                {order.status !== 'cancelled' && (
                  <div className="py-4 border-b border-stone-100 grid grid-cols-4 gap-2">
                    {PROGRESS_STEPS.map((step, idx) => {
                      const reached = idx <= currentStepIndex;
                      return (
                        <div key={step.status} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-sm transition-colors ${
                              reached ? 'bg-[#1B4332]' : 'bg-stone-200'
                            }`}
                          />
                          <p
                            className={`text-xs ${
                              reached ? 'font-medium text-[#141413]' : 'text-stone-400'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Items list */}
                <div className="pt-4 space-y-2.5">
                  {order.items.map((item) => (
                    <div
                      key={item.dishId}
                      className="flex items-center justify-between text-sm gap-4"
                    >
                      <span className="text-[#141413]">
                        {item.name}{' '}
                        <span className="text-stone-500 tabular-nums">× {item.quantity}</span>
                      </span>
                      <span className="text-stone-700 font-medium tabular-nums shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}

                  {order.comment && (
                    <p className="text-xs text-stone-600 pt-2">
                      Комментарий: {order.comment}
                    </p>
                  )}

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-[#141413]">
                    <span>Итого</span>
                    <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
