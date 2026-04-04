'use client';

interface CollarGraphProps {
  price: number;
  floor: number;
  cap: number;
  stockName?: string;
}

export default function CollarGraph({ price, floor, cap, stockName = 'stock' }: CollarGraphProps) {
  return (
    <div>
      <svg viewBox="0 0 340 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        {/* Grid */}
        <line x1="40" y1="20" x2="40" y2="148" stroke="#2A2A2E" strokeWidth="0.5" />
        <line x1="40" y1="148" x2="320" y2="148" stroke="#2A2A2E" strokeWidth="0.5" />
        <line x1="40" y1="84" x2="320" y2="84" stroke="#2A2A2E" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="40" y1="40" x2="320" y2="40" stroke="#2A2A2E" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="40" y1="126" x2="320" y2="126" stroke="#2A2A2E" strokeWidth="0.5" strokeDasharray="3 3" />

        {/* Y-axis labels */}
        <text x="36" y="44" textAnchor="end" fill="#636366" fontSize="9" fontFamily="Geist,sans-serif">${cap.toFixed(0)}</text>
        <text x="36" y="88" textAnchor="end" fill="#636366" fontSize="9" fontFamily="Geist,sans-serif">${price.toFixed(0)}</text>
        <text x="36" y="130" textAnchor="end" fill="#636366" fontSize="9" fontFamily="Geist,sans-serif">${floor.toFixed(0)}</text>

        {/* X-axis */}
        <text x="50" y="164" fill="#636366" fontSize="9" fontFamily="Geist,sans-serif">Today</text>
        <text x="290" y="164" textAnchor="end" fill="#636366" fontSize="9" fontFamily="Geist,sans-serif">Expiry</text>

        {/* Protection zone */}
        <rect x="40" y="40" width="280" height="86" rx="2" fill="#10B981" opacity="0.06" />

        {/* Cap line */}
        <line x1="40" y1="40" x2="320" y2="40" stroke="#10B981" strokeWidth="1.5" strokeDasharray="6 3" />
        <rect x="296" y="30" width="24" height="16" rx="4" fill="#10B981" opacity="0.15" />
        <text x="308" y="41" textAnchor="middle" fill="#10B981" fontSize="8" fontWeight="600" fontFamily="Geist,sans-serif">Cap</text>

        {/* Floor line */}
        <line x1="40" y1="126" x2="320" y2="126" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="6 3" />
        <rect x="290" y="117" width="30" height="16" rx="4" fill="#EF4444" opacity="0.15" />
        <text x="305" y="128" textAnchor="middle" fill="#EF4444" fontSize="8" fontWeight="600" fontFamily="Geist,sans-serif">Floor</text>

        {/* Price movement */}
        <path d="M50 84 C70 84, 80 72, 95 68 S120 78, 140 74 S165 60, 180 65 S200 80, 215 76 S235 58, 250 62 S270 72, 285 68 S300 55, 310 60"
          stroke="#10B981" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M50 84 C70 84, 80 72, 95 68 S120 78, 140 74 S165 60, 180 65 S200 80, 215 76 S235 58, 250 62 S270 72, 285 68 S300 55, 310 60 L310 148 L50 148 Z"
          fill="url(#priceGrad)" opacity="0.3" />
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Current price dot */}
        <circle cx="50" cy="84" r="5" fill="#10B981" />
        <circle cx="50" cy="84" r="9" fill="#10B981" opacity="0.15" />
        <text x="62" y="80" fill="#10B981" fontSize="9" fontWeight="600" fontFamily="Geist,sans-serif">${price.toFixed(0)} now</text>

        {/* Scenario labels */}
        <text x="180" y="32" textAnchor="middle" fill="#10B981" fontSize="8.5" fontWeight="500" fontFamily="Geist,sans-serif" opacity="0.7">
          If {stockName} rises: capped at ${cap.toFixed(2)}
        </text>
        <text x="180" y="142" textAnchor="middle" fill="#EF4444" fontSize="8.5" fontWeight="500" fontFamily="Geist,sans-serif" opacity="0.7">
          If {stockName} drops: protected at ${floor.toFixed(2)}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(16,185,129,0.25)' }} /> Protected zone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#10B981' }} /> Price trend
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#EF4444' }} /> Floor
        </span>
      </div>
    </div>
  );
}
