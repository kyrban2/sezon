import { FormEvent, useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: (token: string) => void;
  onBackToGuest?: () => void;
}

export function AdminLogin({ onSuccess, onBackToGuest }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin.trim()) {
      setError('Введите код доступа');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Неверный код доступа');
        return;
      }
      onSuccess(data.token);
    } catch {
      setError('Не удалось подключиться к серверу');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl p-8">
        <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#141413] mb-5">
          <Lock className="w-5 h-5" strokeWidth={1.75} />
        </div>

        <h1 className="font-display text-2xl font-semibold text-[#141413]">
          Панель администратора
        </h1>
        <p className="text-sm text-stone-600 mt-1.5">
          Введите код доступа для управления заказами и меню ресторана.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-pin-input"
              className="block text-xs font-medium text-stone-700 mb-1.5"
            >
              Код доступа
            </label>
            <input
              id="admin-pin-input"
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Введите код..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Проверка...' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-200">
          <button
            type="button"
            onClick={() => {
              if (onBackToGuest) {
                onBackToGuest();
              } else {
                window.location.href = '/';
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-[#141413] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться в гостевое меню</span>
          </button>
        </div>
      </div>
    </div>
  );
}
