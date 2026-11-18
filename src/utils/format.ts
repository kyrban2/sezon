import { OrderStatus } from '../shared/types';

export const TOTAL_TABLES = 10;

export const TABLE_NAMES: string[] = Array.from(
  { length: TOTAL_TABLES },
  (_, index) => `Стол ${index + 1}`
);

export function getTableFromUrl(): number | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawParam = params.get('table');
    if (rawParam) {
      const parsed = Number(rawParam);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_TABLES) {
        return parsed;
      }
    }
    const pathMatch = /^\/table\/(\d+)/.exec(window.location.pathname);
    if (pathMatch) {
      const parsed = Number(pathMatch[1]);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_TABLES) {
        return parsed;
      }
    }
  } catch {
    // Ignore URL parse issues
  }
  return null;
}

export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(amount))} ₽`;
}

export function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function getOrCreateSessionId(tableNum?: number | null): string {
  const key = tableNum ? `sezon_guest_session_table_${tableNum}` : 'sezon_guest_session_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const prefix = tableNum ? `table${tableNum}` : 'guest';
    const randomPart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    const created = `${prefix}_${randomPart}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `guest_${Date.now().toString(36)}`;
  }
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    description: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  new: {
    label: 'Новый',
    description: 'Заказ поступил администратору и ожидает подтверждения',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  preparing: {
    label: 'Готовится',
    description: 'Заказ принят и готовится на кухне',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  ready: {
    label: 'Готов',
    description: 'Блюда готовы к подаче или выдаче',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  completed: {
    label: 'Выдан',
    description: 'Заказ передан гостю',
    textClass: 'text-stone-700',
    bgClass: 'bg-stone-100',
    borderClass: 'border-stone-200',
  },
  cancelled: {
    label: 'Отменён',
    description: 'Заказ отменён администратором',
    textClass: 'text-red-800',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
};
