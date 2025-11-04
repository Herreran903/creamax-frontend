// components/predesign-card.tsx
'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ModelViewer } from './core/3d/model-viewer';
import { cn } from '@/lib/utils';
import { ModelPredesign3D } from '@/domain/types';

function triHash(key: string) {
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % 9973;
  return sum % 3;
}

export default function PredesignCard({
  m,
  onView,
  onAsk,
  isSelected,
  className,
}: {
  m: ModelPredesign3D;
  onView: (id: string) => void;
  onAsk: (id: string) => void;
  isSelected?: boolean;
  className?: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const [loadErr, setLoadErr] = useState(false);

  const priceFmt = useMemo(
    () =>
      m?.price != null
        ? new Intl.NumberFormat('co-CO', { style: 'currency', currency: 'COP' }).format(
            Number(m.price)
          )
        : null,
    [m?.price]
  );

  const colorIdx = triHash(String(m.id ?? m.name ?? 'x'));
  const titleColorClass =
    colorIdx === 0 ? 'text-sky-600' : colorIdx === 1 ? 'text-emerald-600' : 'text-orange-600';

  const handleSelect = () => onView(m.id);
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-selected={!!isSelected}
      onClick={handleSelect}
      onKeyDown={handleKey}
      className={cn(
        'group relative h-full overflow-hidden bg-white rounded-2xl shadow-none transition',
        isSelected
          ? 'border-emerald-600 ring-2 ring-emerald-300/60 shadow-md'
          : 'border border-border/60 hover:border-foreground/30 hover:shadow-sm',
        'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
        className
      )}
    >
      <div className={cn('relative w-full', 'aspect-square sm:aspect-4/5', 'bg-neutral-100')}>
        {!isReady && !loadErr && (
          <div className="absolute inset-0 animate-[pulse_1.6s_ease-in-out_infinite] bg-neutral-100" />
        )}

        {!loadErr ? (
          <div className="absolute inset-0">
            <ModelViewer
              className="h-full w-full rounded-b-none"
              src={''}
              overlayImage={''}
              demoKind={m.kind}
              disableSpin
              onReady={() => setIsReady(true)}
            />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-neutral-400">
            <span className="text-xs">Vista no disponible</span>
          </div>
        )}

        <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:-translate-y-1" />
      </div>

      <div className="px-2 py-2 sm:px-2.5 sm:py-3">
        <h3
          className={cn(
            'font-semibold leading-tight tracking-[-0.01em] line-clamp-1 uppercase',
            'text-[13px] sm:text-[14px] md:text-[15px]',
            titleColorClass,
            'transition-opacity group-hover:opacity-90'
          )}
          title={m.name}
        >
          {m.name}
        </h3>

        {priceFmt ? (
          <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
            {priceFmt}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
