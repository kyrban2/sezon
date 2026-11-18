import { useMemo, useState } from 'react';
import { Minus, Plus, Search, ArrowRight, Check } from 'lucide-react';
import { CartItem, DISH_CATEGORIES, Dish, DishCategory } from '../shared/types';
import { formatPrice } from '../utils/format';
import { DishImage } from './DishImage';

interface MenuViewProps {
  menu: Dish[];
  cartItems: CartItem[];
  assignedTable?: number | null;
  onUpdateQuantity: (dish: Dish, nextQuantity: number) => void;
  onOpenCart: () => void;
}

const HERO_IMAGE = '/src/assets/images/hero_seasonal_table_1794936262456.jpg';

export function MenuView({
  menu,
  cartItems,
  assignedTable,
  onUpdateQuantity,
  onOpenCart,
}: MenuViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | DishCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.dishId, item.quantity);
    }
    return map;
  }, [cartItems]);

  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return menu.filter((dish) => {
      const matchesCat = selectedCategory === 'all' || dish.category === selectedCategory;
      const matchesQuery =
        !query ||
        dish.name.toLowerCase().includes(query) ||
        dish.description.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [menu, selectedCategory, searchQuery]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalCartItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartAmount = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="pb-24 md:pb-20">
      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 sm:pt-8 sm:pb-12 lg:pt-12 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-stone-200 rounded-2xl p-5 sm:p-10">
            <div>
              <p className="text-xs font-medium text-stone-500 tracking-wide mb-3 sm:mb-4">
                {assignedTable
                  ? `Сезонное бистро · Вы за столиком: Стол ${assignedTable}`
                  : 'Сезонное бистро · Заказ за столик и с собой'}
              </p>
              <h1
                className="font-display font-semibold text-[#141413] tracking-tight leading-[1.08] mb-3.5 sm:mb-5"
                style={{
                  fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Сезонное меню с подачей прямо к столу
              </h1>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
                Выберите понравившиеся блюда — они сразу попадут в вашу корзину. Когда всё будет
                собрано, нажмите «Заказать» в корзине, и заказ моментально поступит администратору.
              </p>
            </div>

            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-200 flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => scrollToSection('menu-catalog')}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Выбрать блюда</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {totalCartItems > 0 ? (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1B4332] bg-[#1B4332]/8 hover:bg-[#1B4332]/14 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                >
                  <span>В корзине: {totalCartItems} шт. · {formatPrice(totalCartAmount)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => scrollToSection('kitchen-story')}
                  className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Как работает заказ
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-48 sm:h-72 lg:h-full lg:min-h-[340px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
              <DishImage
                src={HERO_IMAGE}
                alt="Сезонные блюда на столе бистро Сезон"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Menu Catalog Section */}
      <section
        id="menu-catalog"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-12 sm:pb-16 scroll-mt-4 md:scroll-mt-20"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 sm:pb-6 border-b border-stone-200">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413]">
              Меню кухни
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Добавляйте блюда в корзину, чтобы сформировать заказ для администратора
            </p>
          </div>

          {/* Search input (16px font on mobile to prevent iOS zoom) */}
          <div className="relative w-full md:w-72">
            <Search
              className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по блюдам..."
              aria-label="Поиск по блюдам"
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-base sm:text-sm bg-white border border-stone-200 rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
            />
          </div>
        </div>

        {/* Category segmented filter bar with smooth horizontal scroll on mobile */}
        <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#141413] text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:text-[#141413]'
            }`}
          >
            Все блюда
          </button>
          {DISH_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === category
                  ? 'bg-[#141413] text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:text-[#141413]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Dish Grid */}
        {filteredMenu.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 sm:p-12 text-center">
            <p className="text-base font-medium text-[#141413]">
              По вашему запросу блюда не найдены
            </p>
            <p className="text-sm text-stone-500 mt-1">
              Попробуйте сбросить фильтры или изменить поисковый запрос.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 min-h-[44px] px-5 py-2.5 text-sm font-medium text-[#1B4332] border border-[#1B4332]/30 rounded-lg hover:bg-[#1B4332]/5 transition-colors cursor-pointer"
            >
              Показать всё меню
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {filteredMenu.map((dish) => {
              const qtyInCart = cartQtyMap.get(dish.id) || 0;

              return (
                <article
                  key={dish.id}
                  className="group bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 md:hover:-translate-y-0.5"
                >
                  {/* 4:3 Photo container */}
                  <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                    <DishImage
                      src={dish.imageUrl}
                      alt={dish.name}
                      className={`w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-[1.02] ${
                        !dish.available ? 'opacity-50 grayscale' : ''
                      }`}
                    />
                    {!dish.available && (
                      <div className="absolute inset-0 bg-stone-900/45 flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-white/95 text-[#141413] text-xs font-medium rounded-md">
                          Временно нет в наличии
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 mb-2">
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

                      <h3 className="text-lg font-semibold text-[#141413] leading-snug">
                        {dish.name}
                      </h3>
                      <p className="text-sm text-stone-600 mt-1.5 leading-relaxed line-clamp-2">
                        {dish.description}
                      </p>
                    </div>

                    {/* Price and Cart Action (>=44px touch targets) */}
                    <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                      <span className="text-base font-semibold text-[#141413] tabular-nums">
                        {formatPrice(dish.price)}
                      </span>

                      {!dish.available ? (
                        <button
                          type="button"
                          disabled
                          className="min-h-[44px] px-4 py-2 text-sm font-medium text-stone-400 bg-stone-100 rounded-lg cursor-not-allowed whitespace-nowrap shrink-0"
                        >
                          Стоп-лист
                        </button>
                      ) : qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(dish, 1)}
                          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B4332] active:bg-[#143326] hover:bg-[#143326] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>В корзину</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="inline-flex items-center border border-stone-200 rounded-lg bg-[#F8F8F6]">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(dish, qtyInCart - 1)}
                              aria-label={`Уменьшить количество ${dish.name}`}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-700 hover:text-[#141413] active:bg-stone-200 hover:bg-stone-200/60 rounded-l-lg transition-colors cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-2 text-sm font-semibold text-[#141413] tabular-nums">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(dish, qtyInCart + 1)}
                              aria-label={`Увеличить количество ${dish.name}`}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-700 hover:text-[#141413] active:bg-stone-200 hover:bg-stone-200/60 rounded-r-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={onOpenCart}
                            title="Открыть корзину"
                            className="min-h-[44px] hidden sm:inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-[#1B4332] hover:bg-[#1B4332]/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>В корзине</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Kitchen & Ordering Process Section */}
      <section
        id="kitchen-story"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 scroll-mt-4 md:scroll-mt-20"
      >
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-10">
          <div className="max-w-2xl mb-6 sm:mb-8">
            <h2 className="font-display text-2xl font-semibold text-[#141413]">
              Как оформляется заказ
            </h2>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              Мы убрали лишнее ожидание официанта: ваш выбор сразу виден в системе, а подтверждённый
              заказ мгновенно поступает на кухню.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pt-5 sm:pt-6 border-t border-stone-200">
            <div>
              <p className="text-xs font-mono text-stone-500 mb-1.5">01</p>
              <h3 className="text-base font-semibold text-[#141413]">Выбор в корзину</h3>
              <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                Отмечайте блюда в меню — они попадают в корзину и фиксируются для вашего столика.
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-stone-500 mb-1.5">02</p>
              <h3 className="text-base font-semibold text-[#141413]">Подтверждение в корзине</h3>
              <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                Проверьте состав, укажите номер стола или комментарий для кухни и нажмите «Заказать».
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-stone-500 mb-1.5">03</p>
              <h3 className="text-base font-semibold text-[#141413]">Приём администратором</h3>
              <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                Заказ сразу появляется в панели администратора, а статус готовности обновляется онлайн.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
