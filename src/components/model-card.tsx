import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Model3D } from '@/domain/types';
import { ModelViewer } from './core/3d/model-viewer';
import { cn, formatDate } from '@/lib/utils';

function triHash(key: string) {
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % 9973;
  return sum % 3;
}

export function ModelCard({
  m,
  onOpen,
  className,
}: {
  m: Model3D;
  onOpen: (id: string) => void;
  className?: string;
}) {
  const price = m.price ?? null;
  const priceFmt = useMemo(
    () =>
      price != null
        ? new Intl.NumberFormat('co-CO', { style: 'currency', currency: 'COP' }).format(
            Number(price)
          )
        : null,
    [price]
  );

  const subtitle = formatDate(m?.updatedAt) ?? formatDate(m?.createdAt) ?? m?.description ?? null;

  const src =
    m.source === 'tripo' ? `/api/tripo/proxy?url=${encodeURIComponent(m.fileUrl)}` : m.fileUrl;

  const colorIdx = triHash(String(m.id ?? m.name ?? 'x'));
  const titleColorClass =
    colorIdx === 0 ? 'text-sky-600' : colorIdx === 1 ? 'text-emerald-600' : 'text-orange-600';

  return (
    <Card
      className={cn(
        'group relative h-full overflow-hidden border border-border/60 bg-white',
        'rounded-2xl shadow-none hover:shadow-sm transition-shadow',
        className
      )}
    >
      {m.nfc && (
        <span
          className={cn(
            'absolute left-2 top-2 z-20',
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
            'text-[10px] font-extrabold tracking-wide uppercase',
            'bg-sky-800 text-white ring-1 ring-black/10 shadow-sm'
          )}
        >
          NFC
        </span>
      )}

      <Link href={`/app/models/${m.id}`} aria-label={`Abrir modelo ${m.name}`} className="block">
        <div className={cn('relative w-full', 'aspect-square sm:aspect-4/5', 'bg-neutral-100')}>
          <div className="absolute inset-0 animate-[pulse_1.6s_ease-in-out_infinite] bg-neutral-100" />
          <div className="absolute inset-0">
            <ModelViewer
              className="h-full w-full rounded-b-none"
              src={src}
              overlayImage={m.overlayImageUrl}
              disableSpin
            />
          </div>
          <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:-translate-y-1" />
        </div>
        <div className="px-2 py-2 sm:px-2.5 sm:py-3">
          <h3
            className={cn(
              'font-semibold leading-tight tracking-[-0.01em] line-clamp-1 uppercase',
              'text-[13px] sm:text-[14px] md:text-[15px]',
              titleColorClass,
              'transition-opacity hover:opacity-90'
            )}
          >
            {m.name}
          </h3>

          {subtitle ? (
            <p className="mt-0.5 sm:mt-1 text-[12px] sm:text-[13px] text-neutral-500 leading-snug line-clamp-1">
              {subtitle}
            </p>
          ) : null}

          {priceFmt ? (
            <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
              {priceFmt}
            </p>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}
