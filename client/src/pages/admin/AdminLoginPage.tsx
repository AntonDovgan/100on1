import { useState } from 'react';
import { usePlayer } from '../../contexts/PlayerContext.js';

export function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { loginAdmin } = usePlayer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginAdmin(password);
    if (!success) setError(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Админ-панель</h1>
        <p className="text-gray-500 mt-1">100 к 1 — 8 Марта</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <label className="block text-sm font-medium text-gray-600 mb-2">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Введите пароль..."
            className="w-full px-4 py-3 rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none text-lg text-center"
            autoFocus
          />
          {error && <p className="text-wrong text-sm mt-2 text-center">Неверный пароль</p>}
          <button
            type="submit"
            className="w-full mt-4 py-3 rounded-xl bg-primary text-white text-lg font-semibold hover:bg-primary-dark active:scale-95 transition-all"
          >
            Войти
          </button>
        </div>
      </form>
    </div>
  );
}
