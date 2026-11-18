import fs from 'fs';
import path from 'path';
import {
  ActiveCartSession,
  CartItem,
  Dish,
  DishCategory,
  Order,
  OrderStatus,
} from '../src/shared/types';

interface StoreState {
  nextOrderNumber: number;
  menu: Dish[];
  orders: Order[];
  activeCarts: Record<string, ActiveCartSession>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const DEFAULT_DISH_IMAGE = '/src/assets/images/hero_seasonal_table_1794936262456.jpg';
const ALLOWED_TABLES = new Set([
  ...Array.from({ length: 10 }, (_, i) => `Стол ${i + 1}`),
  'С собой',
]);

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function sanitizeTableNumber(value: unknown): string {
  const clean = sanitizeText(value, 32);
  return ALLOWED_TABLES.has(clean) ? clean : 'Стол 1';
}

function sanitizeImageUrl(value: unknown): string {
  const clean = sanitizeText(value, 500);
  if (!clean) return DEFAULT_DISH_IMAGE;
  if (
    clean.startsWith('/src/assets/') ||
    clean.startsWith('/uploads/') ||
    clean.startsWith('https://') ||
    clean.startsWith('http://')
  ) {
    return clean;
  }
  return DEFAULT_DISH_IMAGE;
}

const SEED_MENU: Dish[] = [
  {
    id: 'dish-burrata',
    name: 'Буррата с печёными томатами',
    category: 'Закуски',
    description:
      'Сливочная буррата, запечённые томаты черри, зелёное масло базилика и тёплый ремесленный хлеб на закваске.',
    price: 780,
    weight: '240 г',
    prepMinutes: 10,
    imageUrl: '/src/assets/images/dish_burrata_tomatoes_1794936265197.jpg',
    available: true,
    tag: 'Выбор шефа',
  },
  {
    id: 'dish-tartare',
    name: 'Тартар из говядины с бриошью',
    category: 'Закуски',
    description:
      'Мраморная вырезка ручной рубки, вяленый желток, каперсы, маринованный шалот и хрустящие тосты из бриоши.',
    price: 890,
    weight: '190 г',
    prepMinutes: 12,
    imageUrl: '/src/assets/images/dish_beef_tartare_1794936263128.jpg',
    available: true,
  },
  {
    id: 'dish-salmon',
    name: 'Лосось со спаржей и лимонным соусом',
    category: 'Горячие блюда',
    description:
      'Филе атлантического лосося с хрустящей кожей, обжаренная зелёная спаржа, соус бёр-блан с укропом и цедрой.',
    price: 1390,
    weight: '290 г',
    prepMinutes: 18,
    imageUrl: '/src/assets/images/dish_salmon_asparagus_1794936262756.jpg',
    available: true,
    tag: 'Сезонное',
  },
  {
    id: 'dish-duck',
    name: 'Утиная ножка конфи с пюре из пастернака',
    category: 'Горячие блюда',
    description:
      'Томлёная утиная ножка с золотистой корочкой, шёлковое пюре из пастернака, глазированная морковь и ягодный жю.',
    price: 1290,
    weight: '320 г',
    prepMinutes: 22,
    imageUrl: '/src/assets/images/dish_duck_confit_1794936263406.jpg',
    available: true,
  },
  {
    id: 'dish-risotto',
    name: 'Ризотто с лисичками и трюфелем',
    category: 'Горячие блюда',
    description:
      'Рис карнароли на грибном бульоне, лесные лисички, стружка чёрного трюфеля, выдержанный пармезан и свежий тимьян.',
    price: 1090,
    weight: '300 г',
    prepMinutes: 20,
    imageUrl: '/src/assets/images/dish_truffle_risotto_1794936264185.jpg',
    available: true,
    tag: 'Выбор шефа',
  },
  {
    id: 'dish-cheesecake',
    name: 'Баскский чизкейк с ягодами',
    category: 'Десерты',
    description:
      'Карамелизованный сливочный чизкейк с нежной серединой, тёплый ягодный соус и свежая малина.',
    price: 560,
    weight: '170 г',
    prepMinutes: 8,
    imageUrl: '/src/assets/images/dish_baked_cheesecake_1794936263994.jpg',
    available: true,
  },
  {
    id: 'dish-fondant',
    name: 'Шоколадный фондан с ванильным пломбиром',
    category: 'Десерты',
    description:
      'Тёплый кекс из тёмного бельгийского шоколада с жидкой сердцевиной и шариком домашнего ванильного джелато.',
    price: 620,
    weight: '180 г',
    prepMinutes: 14,
    imageUrl: '/src/assets/images/dish_chocolate_fondant_1794936264787.jpg',
    available: true,
  },
  {
    id: 'dish-yuzu',
    name: 'Игристый лимонад юдзу-розмарин',
    category: 'Напитки',
    description:
      'Освежающий авторский лимонад на пюре японского цитруса юдзу с веточкой свежего розмарина и дробленым льдом.',
    price: 420,
    weight: '350 мл',
    prepMinutes: 5,
    imageUrl: '/src/assets/images/dish_matcha_yuzu_1794936265025.jpg',
    available: true,
  },
];

function createSeedState(): StoreState {
  const now = Date.now();
  const earlier = new Date(now - 14 * 60 * 1000).toISOString();
  const recent = new Date(now - 6 * 60 * 1000).toISOString();

  return {
    nextOrderNumber: 103,
    menu: SEED_MENU,
    orders: [
      {
        id: 'order-seed-102',
        orderNumber: 102,
        sessionId: 'seed-session-2',
        tableNumber: 'Стол 3',
        customerName: 'Мария',
        comment: 'Подать напиток сразу к закуске',
        items: [
          {
            dishId: 'dish-burrata',
            name: 'Буррата с печёными томатами',
            price: 780,
            imageUrl: '/src/assets/images/dish_burrata_tomatoes_1794936265197.jpg',
            quantity: 1,
          },
          {
            dishId: 'dish-risotto',
            name: 'Ризотто с лисичками и трюфелем',
            price: 1090,
            imageUrl: '/src/assets/images/dish_truffle_risotto_1794936264185.jpg',
            quantity: 1,
          },
          {
            dishId: 'dish-yuzu',
            name: 'Игристый лимонад юдзу-розмарин',
            price: 420,
            imageUrl: '/src/assets/images/dish_matcha_yuzu_1794936265025.jpg',
            quantity: 2,
          },
        ],
        totalAmount: 2710,
        status: 'preparing',
        createdAt: recent,
        updatedAt: recent,
      },
      {
        id: 'order-seed-101',
        orderNumber: 101,
        sessionId: 'seed-session-1',
        tableNumber: 'Стол 7',
        customerName: 'Алексей',
        comment: '',
        items: [
          {
            dishId: 'dish-salmon',
            name: 'Лосось со спаржей и лимонным соусом',
            price: 1390,
            imageUrl: '/src/assets/images/dish_salmon_asparagus_1794936262756.jpg',
            quantity: 2,
          },
          {
            dishId: 'dish-cheesecake',
            name: 'Баскский чизкейк с ягодами',
            price: 560,
            imageUrl: '/src/assets/images/dish_baked_cheesecake_1794936263994.jpg',
            quantity: 1,
          },
        ],
        totalAmount: 3340,
        status: 'ready',
        createdAt: earlier,
        updatedAt: recent,
      },
    ],
    activeCarts: {},
  };
}

class RestaurantStore {
  private state: StoreState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): StoreState {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as StoreState;
        if (parsed && Array.isArray(parsed.menu) && Array.isArray(parsed.orders)) {
          return {
            nextOrderNumber: parsed.nextOrderNumber || 103,
            menu: parsed.menu,
            orders: parsed.orders,
            activeCarts: parsed.activeCarts || {},
          };
        }
      }
    } catch {
      // Fallback to fresh seed if JSON is corrupted
    }
    const seed = createSeedState();
    this.persist(seed);
    return seed;
  }

  private persist(target: StoreState = this.state): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(target, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store:', err);
    }
  }

  getMenu(): Dish[] {
    return this.state.menu;
  }

  getOrders(): Order[] {
    return this.state.orders;
  }

  getOrdersBySession(sessionId: string): Order[] {
    if (!sessionId) return [];
    return this.state.orders.filter((o) => o.sessionId === sessionId);
  }

  getActiveCarts(): ActiveCartSession[] {
    return Object.values(this.state.activeCarts)
      .filter((c) => c && Array.isArray(c.items) && c.items.length > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getCartBySession(sessionId: string): ActiveCartSession | null {
    if (!Object.hasOwn(this.state.activeCarts, sessionId)) return null;
    return this.state.activeCarts[sessionId] || null;
  }

  upsertCart(
    sessionId: string,
    items: CartItem[],
    tableNumber = 'Стол 1',
    customerName = ''
  ): ActiveCartSession[] {
    const cleanItems: CartItem[] = [];
    for (const reqItem of items) {
      const dish = this.state.menu.find((d) => d.id === reqItem.dishId);
      if (!dish || !dish.available) continue;
      const qty = Math.max(0, Math.min(50, Math.floor(Number(reqItem.quantity) || 0)));
      if (qty > 0) {
        cleanItems.push({
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          imageUrl: dish.imageUrl,
          quantity: qty,
        });
      }
    }

    if (cleanItems.length === 0) {
      if (Object.hasOwn(this.state.activeCarts, sessionId)) {
        delete this.state.activeCarts[sessionId];
      }
    } else {
      const totalAmount = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const safeTable = sanitizeTableNumber(tableNumber);
      const safeName = sanitizeText(customerName, 60);
      this.state.activeCarts[sessionId] = {
        sessionId,
        tableNumber: safeTable,
        customerName: safeName,
        items: cleanItems,
        totalAmount,
        updatedAt: new Date().toISOString(),
      };
    }

    this.persist();
    return this.getActiveCarts();
  }

  clearCart(sessionId: string): ActiveCartSession[] {
    if (Object.hasOwn(this.state.activeCarts, sessionId)) {
      delete this.state.activeCarts[sessionId];
      this.persist();
    }
    return this.getActiveCarts();
  }

  submitOrder(payload: {
    sessionId: string;
    tableNumber: string;
    customerName?: string;
    comment?: string;
    items?: CartItem[];
  }): Order {
    const existingCart = Object.hasOwn(this.state.activeCarts, payload.sessionId)
      ? this.state.activeCarts[payload.sessionId]
      : undefined;
    const sourceItems =
      existingCart && existingCart.items.length > 0 ? existingCart.items : payload.items || [];

    const validatedItems: CartItem[] = [];
    for (const item of sourceItems) {
      const dish = this.state.menu.find((d) => d.id === item.dishId);
      if (!dish || !dish.available) continue;
      const qty = Math.max(0, Math.min(50, Math.floor(Number(item.quantity) || 0)));
      if (qty > 0) {
        validatedItems.push({
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          imageUrl: dish.imageUrl,
          quantity: qty,
        });
      }
    }

    if (validatedItems.length === 0) {
      throw new Error('Корзина пуста или выбранные блюда недоступны');
    }

    const totalAmount = validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const now = new Date().toISOString();
    const orderNumber = this.state.nextOrderNumber++;

    const order: Order = {
      id: `order-${orderNumber}-${Date.now()}`,
      orderNumber,
      sessionId: payload.sessionId,
      tableNumber: sanitizeTableNumber(payload.tableNumber),
      customerName: sanitizeText(payload.customerName, 60),
      comment: sanitizeText(payload.comment, 300),
      items: validatedItems,
      totalAmount,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    this.state.orders.unshift(order);
    if (Object.hasOwn(this.state.activeCarts, payload.sessionId)) {
      delete this.state.activeCarts[payload.sessionId];
    }
    this.persist();
    return order;
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    this.persist();
    return order;
  }

  addDish(input: {
    name: string;
    category: DishCategory;
    description: string;
    price: number;
    weight: string;
    prepMinutes: number;
    imageUrl?: string;
    tag?: string;
  }): Dish {
    const dish: Dish = {
      id: `dish-${Date.now()}`,
      name: sanitizeText(input.name, 120),
      category: input.category,
      description: sanitizeText(input.description, 600),
      price: Math.max(1, Math.min(1000000, Math.round(Number(input.price) || 0))),
      weight: sanitizeText(input.weight, 40) || '200 г',
      prepMinutes: Math.max(1, Math.min(300, Math.round(Number(input.prepMinutes) || 15))),
      imageUrl: sanitizeImageUrl(input.imageUrl),
      available: true,
      tag: sanitizeText(input.tag, 40) || undefined,
    };

    this.state.menu.push(dish);
    this.persist();
    return dish;
  }

  updateDish(dishId: string, patch: Partial<Omit<Dish, 'id'>>): Dish | null {
    const dish = this.state.menu.find((d) => d.id === dishId);
    if (!dish) return null;

    if (typeof patch.available === 'boolean') dish.available = patch.available;
    if (typeof patch.price === 'number' && patch.price > 0) {
      dish.price = Math.min(1000000, Math.round(patch.price));
    }
    if (typeof patch.name === 'string' && patch.name.trim()) {
      dish.name = sanitizeText(patch.name, 120);
    }
    if (typeof patch.description === 'string') {
      dish.description = sanitizeText(patch.description, 600);
    }
    if (patch.category && ['Закуски', 'Горячие блюда', 'Десерты', 'Напитки'].includes(patch.category)) {
      dish.category = patch.category;
    }
    if (typeof patch.weight === 'string' && patch.weight.trim()) {
      dish.weight = sanitizeText(patch.weight, 40);
    }
    if (typeof patch.prepMinutes === 'number' && patch.prepMinutes > 0) {
      dish.prepMinutes = Math.min(300, Math.round(patch.prepMinutes));
    }
    if (typeof patch.imageUrl === 'string' && patch.imageUrl.trim()) {
      dish.imageUrl = sanitizeImageUrl(patch.imageUrl);
    }
    if (patch.tag !== undefined) {
      const cleanTag = sanitizeText(patch.tag, 40);
      dish.tag = cleanTag || undefined;
    }

    this.persist();
    return dish;
  }

  deleteDish(dishId: string): boolean {
    const initialLength = this.state.menu.length;
    this.state.menu = this.state.menu.filter((d) => d.id !== dishId);
    if (this.state.menu.length === initialLength) return false;
    this.persist();
    return true;
  }
}

export const store = new RestaurantStore();
