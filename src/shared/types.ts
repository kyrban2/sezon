export type DishCategory = 'Закуски' | 'Горячие блюда' | 'Десерты' | 'Напитки';

export const DISH_CATEGORIES: DishCategory[] = [
  'Закуски',
  'Горячие блюда',
  'Десерты',
  'Напитки',
];

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  description: string;
  price: number;
  weight: string;
  prepMinutes: number;
  imageUrl: string;
  available: boolean;
  tag?: string;
}

export interface DishInput {
  name: string;
  category: DishCategory;
  description: string;
  price: number;
  weight: string;
  prepMinutes: number;
  imageUrl?: string;
  tag?: string;
}

export type DishPatch = Partial<Omit<Dish, 'id'>>;

export interface CartItem {
  dishId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

export interface ActiveCartSession {
  sessionId: string;
  tableNumber: string;
  customerName: string;
  items: CartItem[];
  totalAmount: number;
  updatedAt: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: number;
  sessionId: string;
  tableNumber: string;
  customerName: string;
  comment: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GuestBootstrapPayload {
  menu: Dish[];
  myOrders: Order[];
  myCart: ActiveCartSession | null;
}

export interface AdminBootstrapPayload {
  menu: Dish[];
  orders: Order[];
  activeCarts: ActiveCartSession[];
}

export type RealtimeEvent =
  | { type: 'menu:updated'; menu: Dish[] }
  | { type: 'carts:updated'; activeCarts: ActiveCartSession[] }
  | { type: 'order:created'; order: Order }
  | { type: 'order:updated'; order: Order };
