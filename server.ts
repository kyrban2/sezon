import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  DISH_CATEGORIES,
  DishCategory,
  OrderStatus,
  RealtimeEvent,
} from './src/shared/types';
import { store } from './server/store';

const PORT = 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{6,80}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface SSEClient {
  res: Response;
  isAdmin: boolean;
  sessionId?: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const sseClients = new Set<SSEClient>();
const adminTokens = new Map<string, number>(); // token -> expiresAt
const rateBuckets = new Map<string, RateBucket>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) {
    return false;
  }
  existing.count += 1;
  return true;
}

// Periodically prune expired tokens and rate-limit buckets
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of adminTokens.entries()) {
    if (now > expiresAt) adminTokens.delete(token);
  }
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

function isValidSessionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    SESSION_ID_REGEX.test(value) &&
    !FORBIDDEN_KEYS.has(value)
  );
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    // Compare against dummy buffer to keep timing uniform
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractAdminToken(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const queryToken = req.query.adminToken;
  return typeof queryToken === 'string' ? queryToken.trim() : '';
}

function isTokenValid(token: string): boolean {
  if (!token) return false;
  const expiresAt = adminTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    adminTokens.delete(token);
    return false;
  }
  return true;
}

function isAdminAuthenticated(req: Request): boolean {
  return isTokenValid(extractAdminToken(req));
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({ error: 'Требуется авторизация администратора' });
    return;
  }
  next();
}

function verifyImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;
  if (ext === 'png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (ext === 'jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (ext === 'webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (ext === 'gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  return false;
}

function broadcast(event: RealtimeEvent): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      if (client.isAdmin) {
        client.res.write(payload);
        continue;
      }

      if (event.type === 'menu:updated') {
        client.res.write(payload);
      } else if (
        (event.type === 'order:created' || event.type === 'order:updated') &&
        client.sessionId &&
        event.order.sessionId === client.sessionId
      ) {
        client.res.write(payload);
      } else if (event.type === 'carts:updated' && client.sessionId) {
        const myCart = event.activeCarts.filter((c) => c.sessionId === client.sessionId);
        client.res.write(
          `data: ${JSON.stringify({ type: 'carts:updated', activeCarts: myCart })}\n\n`
        );
      }
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Dedicated 8MB JSON parser strictly for admin image upload
  app.use('/api/admin/upload', express.json({ limit: '8mb' }));
  // Tight 64KB JSON limit for all other routes
  app.use(express.json({ limit: '64kb' }));

  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  app.get('/api/events', (req, res) => {
    const adminToken = typeof req.query.adminToken === 'string' ? req.query.adminToken.trim() : '';
    const rawSessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
    const isAdmin = isTokenValid(adminToken);
    const sessionId = isValidSessionId(rawSessionId) ? rawSessionId : undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(': connected\n\n');
    const client: SSEClient = { res, isAdmin, sessionId };
    sseClients.add(client);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(client);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(client);
    });
  });

  // Guest bootstrap — returns only public menu and this guest's own cart & orders
  app.get('/api/bootstrap', (req, res) => {
    const rawSessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
    const sessionId = isValidSessionId(rawSessionId) ? rawSessionId : '';
    res.json({
      menu: store.getMenu(),
      myOrders: sessionId ? store.getOrdersBySession(sessionId) : [],
      myCart: sessionId ? store.getCartBySession(sessionId) : null,
    });
  });

  // Admin auth with brute-force rate limiting and constant-time PIN comparison
  app.post('/api/admin/login', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`login:${ip}`, 5, 5 * 60 * 1000)) {
      res.status(429).json({
        error: 'Слишком много попыток входа. Повторите через 5 минут.',
      });
      return;
    }

    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!pin || !constantTimeEquals(pin, ADMIN_PIN)) {
      res.status(401).json({ error: 'Неверный код доступа' });
      return;
    }

    // Clear failed-attempt bucket on successful auth
    rateBuckets.delete(`login:${ip}`);
    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.set(token, Date.now() + ADMIN_TOKEN_TTL_MS);
    res.json({ token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractAdminToken(req);
    if (token) {
      adminTokens.delete(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/bootstrap', requireAdmin, (_req, res) => {
    res.json({
      menu: store.getMenu(),
      orders: store.getOrders(),
      activeCarts: store.getActiveCarts(),
    });
  });

  // Image upload for Admin with magic-byte validation
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    const { dataUrl } = req.body || {};
    if (typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Файл изображения не передан' });
      return;
    }

    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Поддерживаются только изображения PNG, JPG, WEBP или GIF' });
      return;
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Размер изображения не должен превышать 5 МБ' });
      return;
    }

    if (!verifyImageMagicBytes(buffer, ext)) {
      res.status(400).json({ error: 'Содержимое файла не соответствует формату изображения' });
      return;
    }

    const filename = `dish_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    res.status(201).json({ imageUrl: `/uploads/${filename}` });
  });

  app.get('/api/menu', (_req, res) => {
    res.json(store.getMenu());
  });

  app.post('/api/menu', requireAdmin, (req, res) => {
    const { name, category, description, price, weight, prepMinutes, imageUrl, tag } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Укажите название блюда' });
      return;
    }
    if (!DISH_CATEGORIES.includes(category as DishCategory)) {
      res.status(400).json({ error: 'Выберите корректную категорию' });
      return;
    }
    if (!price || Number(price) <= 0) {
      res.status(400).json({ error: 'Цена должна быть больше нуля' });
      return;
    }

    const created = store.addDish({
      name,
      category,
      description: typeof description === 'string' ? description : '',
      price: Number(price),
      weight: typeof weight === 'string' ? weight : '220 г',
      prepMinutes: Number(prepMinutes) || 15,
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
      tag: typeof tag === 'string' ? tag : undefined,
    });

    broadcast({ type: 'menu:updated', menu: store.getMenu() });
    res.status(201).json(created);
  });

  app.patch('/api/menu/:id', requireAdmin, (req, res) => {
    const updated = store.updateDish(req.params.id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Блюдо не найдено' });
      return;
    }
    broadcast({ type: 'menu:updated', menu: store.getMenu() });
    res.json(updated);
  });

  app.delete('/api/menu/:id', requireAdmin, (req, res) => {
    const removed = store.deleteDish(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'Блюдо не найдено' });
      return;
    }
    broadcast({ type: 'menu:updated', menu: store.getMenu() });
    res.json({ ok: true });
  });

  app.put('/api/cart', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`cart:${ip}`, 90, 60 * 1000)) {
      res.status(429).json({ error: 'Слишком частые обновления корзины' });
      return;
    }

    const { sessionId, items, tableNumber, customerName } = req.body || {};
    if (!isValidSessionId(sessionId)) {
      res.status(400).json({ error: 'Некорректный идентификатор сессии' });
      return;
    }
    if (!Array.isArray(items) || items.length > 50) {
      res.status(400).json({ error: 'Некорректный формат корзины' });
      return;
    }

    const activeCarts = store.upsertCart(sessionId, items, tableNumber, customerName);
    broadcast({ type: 'carts:updated', activeCarts });
    res.json({
      myCart: store.getCartBySession(sessionId),
    });
  });

  app.delete('/api/cart/:sessionId', (req, res) => {
    if (!isValidSessionId(req.params.sessionId)) {
      res.status(400).json({ error: 'Некорректный идентификатор сессии' });
      return;
    }
    const activeCarts = store.clearCart(req.params.sessionId);
    broadcast({ type: 'carts:updated', activeCarts });
    res.json({ ok: true });
  });

  app.post('/api/orders', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`order:${ip}`, 15, 60 * 1000)) {
      res.status(429).json({ error: 'Слишком много заказов подряд. Подождите минуту.' });
      return;
    }

    const { sessionId, tableNumber, customerName, comment, items } = req.body || {};
    if (!isValidSessionId(sessionId)) {
      res.status(400).json({ error: 'Некорректный идентификатор сессии' });
      return;
    }

    try {
      const order = store.submitOrder({
        sessionId,
        tableNumber: typeof tableNumber === 'string' ? tableNumber : 'Стол 1',
        customerName: typeof customerName === 'string' ? customerName : '',
        comment: typeof comment === 'string' ? comment : '',
        items: Array.isArray(items) ? items.slice(0, 50) : undefined,
      });

      broadcast({ type: 'order:created', order });
      broadcast({ type: 'carts:updated', activeCarts: store.getActiveCarts() });
      res.status(201).json(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось оформить заказ';
      res.status(400).json({ error: message });
    }
  });

  app.patch('/api/orders/:id/status', requireAdmin, (req, res) => {
    const { status } = req.body || {};
    const validStatuses: OrderStatus[] = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Некорректный статус заказа' });
      return;
    }

    const updated = store.updateOrderStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }

    broadcast({ type: 'order:updated', order: updated });
    res.json(updated);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
