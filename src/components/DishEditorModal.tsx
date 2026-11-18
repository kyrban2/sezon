import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { DISH_CATEGORIES, Dish, DishCategory, DishInput } from '../shared/types';
import { DishImage } from './DishImage';

interface DishEditorModalProps {
  isOpen: boolean;
  dish: Dish | null;
  onClose: () => void;
  onUploadImage: (dataUrl: string) => Promise<string>;
  onSave: (payload: DishInput, dishId?: string) => Promise<void>;
}

const DEFAULT_IMAGES = [
  '/src/assets/images/dish_burrata_tomatoes_1794936265197.jpg',
  '/src/assets/images/dish_salmon_asparagus_1794936262756.jpg',
  '/src/assets/images/dish_truffle_risotto_1794936264185.jpg',
  '/src/assets/images/dish_baked_cheesecake_1794936263994.jpg',
  '/src/assets/images/dish_matcha_yuzu_1794936265025.jpg',
];

export function DishEditorModal({
  isOpen,
  dish,
  onClose,
  onUploadImage,
  onSave,
}: DishEditorModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DishCategory>('Горячие блюда');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('850');
  const [weight, setWeight] = useState('250 г');
  const [prepMinutes, setPrepMinutes] = useState('15');
  const [tag, setTag] = useState('');
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGES[0]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (dish) {
      setName(dish.name);
      setCategory(dish.category);
      setDescription(dish.description);
      setPrice(String(dish.price));
      setWeight(dish.weight);
      setPrepMinutes(String(dish.prepMinutes));
      setTag(dish.tag || '');
      setImageUrl(dish.imageUrl);
    } else {
      setName('');
      setCategory('Горячие блюда');
      setDescription('');
      setPrice('850');
      setWeight('250 г');
      setPrepMinutes('15');
      setTag('');
      setImageUrl(DEFAULT_IMAGES[0]);
    }
  }, [isOpen, dish]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5 МБ');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
        reader.readAsDataURL(file);
      });

      const uploadedUrl = await onUploadImage(dataUrl);
      setImageUrl(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Укажите название блюда');
      return;
    }
    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      setError('Цена должна быть больше нуля');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          category,
          description: description.trim(),
          price: numericPrice,
          weight: weight.trim() || '220 г',
          prepMinutes: Math.max(1, Number(prepMinutes) || 15),
          imageUrl: imageUrl.trim() || DEFAULT_IMAGES[0],
          tag: tag.trim() || undefined,
        },
        dish?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить блюдо');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dish ? 'Редактирование блюда' : 'Новое блюдо'}
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full sm:max-w-2xl bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4">
          <h2 className="text-base sm:text-lg font-semibold text-[#141413] truncate">
            {dish ? `Редактирование: ${dish.name}` : 'Новое блюдо в меню'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-[#141413] hover:bg-stone-100 rounded-lg cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Image Preview & Upload Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-5">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <DishImage
                  src={imageUrl}
                  alt={name || 'Предпросмотр блюда'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="sm:col-span-7 space-y-3">
              <div>
                <span className="block text-xs font-medium text-stone-700 mb-1.5">
                  Фотография блюда
                </span>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#141413] bg-[#F8F8F6] hover:bg-stone-200/70 border border-stone-200 rounded-lg transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Загрузка фото...' : 'Загрузить с устройства'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
              </div>

              <div>
                <label
                  htmlFor="dish-image-url"
                  className="block text-xs font-medium text-stone-600 mb-1"
                >
                  Или укажите ссылку на изображение
                </label>
                <input
                  id="dish-image-url"
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="/src/assets/images/..."
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="dish-name-input"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Название блюда
              </label>
              <input
                id="dish-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Тартар из тунца с авокадо"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="dish-category-select"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Категория
              </label>
              <select
                id="dish-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as DishCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
              >
                {DISH_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="dish-price-input"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Цена (₽)
              </label>
              <input
                id="dish-price-input"
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] tabular-nums focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="dish-weight-input"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Выход / объём
              </label>
              <input
                id="dish-weight-input"
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="250 г"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="dish-prep-input"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Время приготовления (мин)
              </label>
              <input
                id="dish-prep-input"
                type="number"
                min="1"
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] tabular-nums focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dish-tag-input"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Короткая отметка (необязательно)
              </label>
              <input
                id="dish-tag-input"
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Например, Выбор шефа или Новинка"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dish-desc-input"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Описание и состав блюда
              </label>
              <textarea
                id="dish-desc-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите ключевые ингредиенты, соус и подачу..."
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332] resize-y"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-4 pb-safe border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {saving ? 'Сохранение...' : dish ? 'Сохранить изменения' : 'Добавить в меню'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
