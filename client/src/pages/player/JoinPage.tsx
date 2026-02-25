import { useState } from 'react';
import { usePlayer } from '../../contexts/PlayerContext.js';
import { useSound } from '../../contexts/SoundContext.js';

export function JoinPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = usePlayer();
  const { unlockAudio, isUnlocked } = useSound();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!isUnlocked) unlockAudio();
    setLoading(true);
    setError('');

    const result = await register(name.trim());
    if (!result.success) {
      setError(result.error || 'Ошибка регистрации');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-5xl font-bold text-primary mb-2">100 к 1</h1>
        <p className="text-purple text-lg">8 Марта</p>
        <div className="text-4xl mt-2">💐</div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm animate-fade-in">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя..."
            className="w-full px-4 py-3 rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none text-lg text-center"
            autoFocus
            disabled={loading}
          />

          {error && (
            <p className="text-wrong text-sm mt-2 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full mt-4 py-3 rounded-xl bg-primary text-white text-lg font-semibold
              hover:bg-primary-dark active:scale-95 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Подключение...' : 'Играть!'}
          </button>
        </div>
      </form>
    </div>
  );
}
