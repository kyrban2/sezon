import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { ActiveCartSession, Order } from '../shared/types';
import { ORDER_STATUS_META, formatPrice } from '../utils/format';

interface AdminAnalyticsProps {
  orders: Order[];
  activeCarts: ActiveCartSession[];
}

interface FunnelStage {
  key: string;
  label: string;
  description: string;
  count: number;
  amount: number;
  ofTopPercent: number;
  stepConversionPercent: number | null;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDateTimeRu(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDayRu(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(y, m - 1, d));
}

export function AdminAnalytics({ orders, activeCarts }: AdminAnalyticsProps) {
  const currentMonth = useMemo(() => getCurrentMonthKey(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const monthOrders = useMemo(() => {
    return orders.filter((o) => o.createdAt.slice(0, 7) === selectedMonth);
  }, [orders, selectedMonth]);

  const monthActiveCarts = useMemo(() => {
    return activeCarts.filter((c) => c.updatedAt.slice(0, 7) === selectedMonth);
  }, [activeCarts, selectedMonth]);

  const analytics = useMemo(() => {
    const validOrders = monthOrders.filter((o) => o.status !== 'cancelled');
    const cancelledOrders = monthOrders.filter((o) => o.status === 'cancelled');

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedOrders = monthOrders.filter((o) => o.status === 'completed');
    const completedRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageCheck = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

    // Cumulative order funnel stages
    const cartsCount = monthActiveCarts.length;
    const cartsAmount = monthActiveCarts.reduce((sum, c) => sum + c.totalAmount, 0);

    const submittedCount = monthOrders.length;
    const submittedAmount = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const startedCount = submittedCount + cartsCount;
    const startedAmount = submittedAmount + cartsAmount;

    const acceptedOrders = monthOrders.filter(
      (o) => o.status === 'preparing' || o.status === 'ready' || o.status === 'completed'
    );
    const readyOrCompletedOrders = monthOrders.filter(
      (o) => o.status === 'ready' || o.status === 'completed'
    );

    const rawStages = [
      {
        key: 'started',
        label: 'Выбор в корзине',
        description: 'Все гости, собравшие корзину или отправившие заказ',
        count: startedCount,
        amount: startedAmount,
      },
      {
        key: 'submitted',
        label: 'Отправлено («Заказать»)',
        description: 'Подтверждённые заказы, поступившие администратору',
        count: submittedCount,
        amount: submittedAmount,
      },
      {
        key: 'preparing',
        label: 'Принято на кухню',
        description: 'Заказы, взятые в работу администратором',
        count: acceptedOrders.length,
        amount: acceptedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      },
      {
        key: 'ready',
        label: 'Приготовлено',
        description: 'Заказы, отмеченные как готовые к подаче',
        count: readyOrCompletedOrders.length,
        amount: readyOrCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      },
      {
        key: 'completed',
        label: 'Выдано гостю',
        description: 'Полностью завершённые заказы',
        count: completedOrders.length,
        amount: completedRevenue,
      },
    ];

    const topCount = Math.max(1, rawStages[0].count);
    const funnel: FunnelStage[] = rawStages.map((stage, index) => {
      const prev = index > 0 ? rawStages[index - 1].count : null;
      const stepConv =
        prev !== null && prev > 0 ? Math.round((stage.count / prev) * 100) : prev === 0 ? 0 : null;
      return {
        ...stage,
        ofTopPercent: rawStages[0].count > 0 ? Math.round((stage.count / topCount) * 100) : 0,
        stepConversionPercent: stepConv,
      };
    });

    // Daily revenue breakdown for selected month
    const dayMap = new Map<string, { day: string; count: number; revenue: number }>();
    for (const order of validOrders) {
      const dayKey = order.createdAt.slice(0, 10);
      const existing = dayMap.get(dayKey) || { day: dayKey, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += order.totalAmount;
      dayMap.set(dayKey, existing);
    }
    const dailyStats = Array.from(dayMap.values()).sort((a, b) => b.day.localeCompare(a.day));
    const maxDailyRevenue = Math.max(1, ...dailyStats.map((d) => d.revenue));

    // Top dishes breakdown for selected month
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of validOrders) {
      for (const item of order.items) {
        const existing = dishMap.get(item.name) || { name: item.name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.price * item.quantity;
        dishMap.set(item.name, existing);
      }
    }
    const topDishes = Array.from(dishMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Table revenue breakdown
    const tableMap = new Map<string, { table: string; count: number; revenue: number }>();
    for (const order of validOrders) {
      const existing = tableMap.get(order.tableNumber) || {
        table: order.tableNumber,
        count: 0,
        revenue: 0,
      };
      existing.count += 1;
      existing.revenue += order.totalAmount;
      tableMap.set(order.tableNumber, existing);
    }
    const tableStats = Array.from(tableMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      completedRevenue,
      cancelledRevenue,
      averageCheck,
      validCount: validOrders.length,
      cancelledCount: cancelledOrders.length,
      completedCount: completedOrders.length,
      funnel,
      dailyStats,
      maxDailyRevenue,
      topDishes,
      tableStats,
    };
  }, [monthOrders, monthActiveCarts]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const monthTitle = formatMonthLabel(selectedMonth);

    // Sheet 1: Summary
    const summaryRows = [
      ['Отчёт ресторана «Сезон»', monthTitle],
      ['Дата выгрузки', formatDateTimeRu(new Date().toISOString())],
      [],
      ['Показатель', 'Значение'],
      ['Выручка за месяц (без отмен), ₽', analytics.totalRevenue],
      ['Выручка по выданным заказам, ₽', analytics.completedRevenue],
      ['Упущенная выручка (отмены), ₽', analytics.cancelledRevenue],
      ['Всего активных/выполненных заказов', analytics.validCount],
      ['Выдано заказов', analytics.completedCount],
      ['Отменено заказов', analytics.cancelledCount],
      ['Средний чек, ₽', analytics.averageCheck],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 40 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

    // Sheet 2: Order Funnel
    const funnelRows = [
      ['Этап воронки', 'Описание', 'Количество', 'Доля от начала (%)', 'Конверсия этапа (%)', 'Сумма, ₽'],
      ...analytics.funnel.map((stage) => [
        stage.label,
        stage.description,
        stage.count,
        stage.ofTopPercent,
        stage.stepConversionPercent === null ? '—' : stage.stepConversionPercent,
        stage.amount,
      ]),
    ];
    const wsFunnel = XLSX.utils.aoa_to_sheet(funnelRows);
    wsFunnel['!cols'] = [
      { wch: 26 },
      { wch: 44 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFunnel, 'Воронка заказов');

    // Sheet 3: Daily Revenue
    const dailyRows = [
      ['Дата', 'Количество заказов', 'Выручка, ₽'],
      ...analytics.dailyStats.map((d) => [d.day, d.count, d.revenue]),
    ];
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
    wsDaily['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Выручка по дням');

    // Sheet 4: Dishes & Tables
    const dishesRows = [
      ['Блюдо', 'Продано порций', 'Выручка, ₽'],
      ...analytics.topDishes.map((d) => [d.name, d.qty, d.revenue]),
    ];
    const wsDishes = XLSX.utils.aoa_to_sheet(dishesRows);
    wsDishes['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsDishes, 'Продажи по блюдам');

    // Sheet 5: Detailed Orders
    const orderRows = [
      ['№ заказа', 'Дата и время', 'Стол', 'Гость', 'Статус', 'Состав заказа', 'Комментарий', 'Сумма, ₽'],
      ...monthOrders.map((o) => [
        o.orderNumber,
        formatDateTimeRu(o.createdAt),
        o.tableNumber,
        o.customerName || '—',
        ORDER_STATUS_META[o.status].label,
        o.items.map((i) => `${i.name} × ${i.quantity}`).join('; '),
        o.comment || '',
        o.totalAmount,
      ]),
    ];
    const wsOrders = XLSX.utils.aoa_to_sheet(orderRows);
    wsOrders['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 48 },
      { wch: 26 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Все заказы');

    XLSX.writeFile(wb, `sezon-vyruchka-${selectedMonth}.xlsx`);
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Month Controls + Excel Download */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
            aria-label="Предыдущий месяц"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#F8F8F6] hover:bg-stone-200/70 border border-stone-200 rounded-lg text-[#141413] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) setSelectedMonth(e.target.value);
            }}
            aria-label="Выбор месяца отчёта"
            className="min-h-[44px] px-3 py-2 text-base sm:text-sm font-medium bg-[#F8F8F6] border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
          />

          <button
            type="button"
            onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
            aria-label="Следующий месяц"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#F8F8F6] hover:bg-stone-200/70 border border-stone-200 rounded-lg text-[#141413] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-medium text-stone-600 ml-1">
            {formatMonthLabel(selectedMonth)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Скачать Excel (.xlsx)</span>
        </button>
      </div>

      {/* Monthly Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-stone-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
        <div className="p-5">
          <p className="text-xs font-medium text-stone-500">Выручка за месяц</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
            {formatPrice(analytics.totalRevenue)}
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            Выдано: {formatPrice(analytics.completedRevenue)}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-stone-500">Средний чек</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
            {formatPrice(analytics.averageCheck)}
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            По {analytics.validCount} заказам
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-stone-500">Выдано гостям</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
            {analytics.completedCount}
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            Из {monthOrders.length} оформленных
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-stone-500">Отмены</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#141413] mt-1 tabular-nums">
            {analytics.cancelledCount}
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            Сумма: {formatPrice(analytics.cancelledRevenue)}
          </p>
        </div>
      </div>

      {/* Order Funnel */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-200">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#141413]">
              Воронка заказов
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Путь гостя от добавления блюд в корзину до выдачи заказа за {formatMonthLabel(selectedMonth).toLowerCase()}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600">
            <TrendingUp className="w-4 h-4 text-[#1B4332]" />
            <span className="tabular-nums">
              Итоговая конверсия: {analytics.funnel[analytics.funnel.length - 1]?.ofTopPercent ?? 0}%
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {analytics.funnel.map((stage) => (
            <div key={stage.key} className="space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-[#141413]">{stage.label}</span>
                  <span className="text-xs text-stone-500">{stage.description}</span>
                </div>
                <div className="flex items-center gap-3 text-sm tabular-nums shrink-0">
                  <span className="font-semibold text-[#141413]">{stage.count}</span>
                  <span className="text-stone-500 text-xs">{stage.ofTopPercent}%</span>
                  {stage.stepConversionPercent !== null && (
                    <span className="text-xs text-[#1B4332] font-medium">
                      шаг {stage.stepConversionPercent}%
                    </span>
                  )}
                  <span className="text-stone-700 font-medium min-w-[78px] text-right">
                    {formatPrice(stage.amount)}
                  </span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-stone-100 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#1B4332] transition-all duration-300"
                  style={{ width: `${Math.max(stage.count > 0 ? 4 : 0, stage.ofTopPercent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Revenue & Top Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-stone-200 rounded-xl p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold text-[#141413] pb-4 border-b border-stone-200">
            Выручка по дням
          </h2>

          {analytics.dailyStats.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">
              За выбранный месяц заказов пока нет
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.dailyStats.map((day) => {
                const widthPct = Math.round((day.revenue / analytics.maxDailyRevenue) * 100);
                return (
                  <div key={day.day} className="space-y-1">
                    <div className="flex items-center justify-between text-sm gap-3 tabular-nums">
                      <span className="font-medium text-[#141413]">
                        {formatDayRu(day.day)}
                        <span className="text-xs font-normal text-stone-500 ml-2">
                          {day.count} зак.
                        </span>
                      </span>
                      <span className="font-semibold text-[#141413]">
                        {formatPrice(day.revenue)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#1B4332]/85"
                        style={{ width: `${Math.max(4, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-stone-200 rounded-xl p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold text-[#141413] pb-4 border-b border-stone-200">
            Популярные блюда и столы
          </h2>

          {analytics.topDishes.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">
              Данных о продажах за этот месяц пока нет
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              <div className="divide-y divide-stone-100">
                {analytics.topDishes.slice(0, 6).map((dish) => (
                  <div
                    key={dish.name}
                    className="py-2.5 first:pt-0 flex items-center justify-between text-sm gap-4"
                  >
                    <span className="text-[#141413] truncate">{dish.name}</span>
                    <div className="flex items-center gap-4 tabular-nums shrink-0">
                      <span className="text-xs text-stone-500">{dish.qty} шт.</span>
                      <span className="font-semibold text-[#141413]">
                        {formatPrice(dish.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {analytics.tableStats.length > 0 && (
                <div className="pt-4 border-t border-stone-200">
                  <p className="text-xs font-medium text-stone-500 mb-2.5">Выручка по столам</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {analytics.tableStats.map((t) => (
                      <div
                        key={t.table}
                        className="p-2.5 bg-[#F8F8F6] border border-stone-200 rounded-lg tabular-nums"
                      >
                        <p className="text-xs text-stone-600">
                          {t.table} · {t.count} зак.
                        </p>
                        <p className="text-sm font-semibold text-[#141413] mt-0.5">
                          {formatPrice(t.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
