import { ShoppingBag, UtensilsCrossed, ClipboardList } from 'lucide-react';
import { formatPrice } from '../utils/format';

export type GuestView = 'menu' | 'orders';

interface TopBarProps {
  activeView: GuestView;
  onNavigate: (view: GuestView, sectionId?: string) => void;
  cartCount: number;
  cartTotal: number;
  assignedTable?: number | null;
  onOpenCart: () => void;
}

export function TopBar({
  activeView,
  onNavigate,
  cartCount,
  cartTotal,
  assignedTable,
  onOpenCart,
}: TopBarProps) {
  return (
    <>
      {/* Desktop sticky 3-zone bar; non-sticky compact header on mobile to keep sticky chrome <= 15% */}
      <header className="md:sticky md:top-0 z-30 bg-[#F8F8F6]/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className="font-display text-2xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332]"
          >
            Сезон
          </button>

          {/* Mobile table context indicator (text only, no pills) */}
          {assignedTable && (
            <span className="md:hidden text-xs font-medium text-stone-600 whitespace-nowrap truncate">
              Стол {assignedTable}
            </span>
          )}

          {/* Zone 2: Clean single-line desktop navigation links */}
          <nav
            aria-label="Основная навигация"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600"
          >
            <button
              type="button"
              onClick={() => onNavigate('menu', 'menu-catalog')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeView === 'menu'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Меню
            </button>
            <button
              type="button"
              onClick={() => onNavigate('menu', 'kitchen-story')}
              className="py-1 border-b-2 border-transparent hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              О кухне
            </button>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeView === 'orders'
                  ? 'text-[#141413] border-[#1B4332]'
                  : 'border-transparent hover:text-[#141413]'
              }`}
            >
              Мои заказы
            </button>
          </nav>

          {/* Zone 3: Desktop primary CTA (mobile uses thumb-zone bottom bar) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>Корзина</span>
              <span className="tabular-nums opacity-90">· {cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Thumb-Zone Bottom Bar (<= 64px height, < 10% viewport) */}
      <nav
        aria-label="Мобильная навигация"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe"
      >
        <div className="grid grid-cols-3 h-14 items-center px-2">
          <button
            type="button"
            onClick={() => onNavigate('menu', 'menu-catalog')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
              activeView === 'menu' ? 'text-[#1B4332]' : 'text-stone-500'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" strokeWidth={activeView === 'menu' ? 2.1 : 1.75} />
            <span className="text-[11px] font-medium leading-none">Меню</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
              activeView === 'orders' ? 'text-[#1B4332]' : 'text-stone-500'
            }`}
          >
            <ClipboardList className="w-5 h-5" strokeWidth={activeView === 'orders' ? 2.1 : 1.75} />
            <span className="text-[11px] font-medium leading-none">Заказы</span>
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="min-h-[44px] mx-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#1B4332] active:bg-[#143326] text-white px-3 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.85} />
            <span className="text-xs font-medium tabular-nums whitespace-nowrap">
              {cartCount > 0 ? `${cartCount} · ${formatPrice(cartTotal)}` : 'Корзина'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
