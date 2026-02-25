const petals = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 5}s`,
  duration: `${5 + Math.random() * 5}s`,
  size: 16 + Math.random() * 20,
}));

export function FestiveBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float opacity-20"
          style={{
            left: p.left,
            top: '-40px',
            animationDelay: p.delay,
            animationDuration: p.duration,
            fontSize: `${p.size}px`,
          }}
        >
          🌸
        </div>
      ))}
    </div>
  );
}
