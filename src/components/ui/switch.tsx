'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

type Size = 'sm' | 'md';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  /** Tamaño visual (por defecto: 'md') */
  size?: Size;
}

/**
 * Switch accesible, animado y visualmente claro.
 * - ON: azul (#0B4D67), ✔︎
 * - OFF: gris, ✕
 * - Thumb con animación real (transform via style)
 */
const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  ({ className, size = 'md', checked, defaultChecked, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultChecked ?? false);
    const isControlled = checked !== undefined;
    const isOn = isControlled ? checked : internal;

    const handleChange = (v: boolean) => {
      if (!isControlled) setInternal(v);
      props.onCheckedChange?.(v);
    };

    const dims =
      size === 'sm'
        ? { rootH: 20, rootW: 36, thumb: 16, translate: 16, icon: 10 }
        : { rootH: 24, rootW: 44, thumb: 18, translate: 20, icon: 12 };

    return (
      <SwitchPrimitives.Root
        ref={ref}
        {...props}
        checked={isOn}
        onCheckedChange={handleChange}
        style={{
          width: dims.rootW,
          height: dims.rootH,
        }}
        className={cn(
          'relative inline-flex items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4D67] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          isOn ? 'bg-[#125068]' : 'bg-muted',
          className
        )}
      >
        <span
          className={cn(
            'absolute top-0.4 left-0.4 rounded-full border border-black/10 bg-white shadow-lg ring-0 flex items-center justify-center transition-all duration-200 ease-out'
          )}
          style={{
            width: dims.thumb,
            height: dims.thumb,
            transform: isOn ? `translateX(${dims.translate}px)` : 'translateX(0px)',
          }}
        >
          {isOn ? (
            <Check className="text-[#0B4D67]" size={dims.icon} />
          ) : (
            <X className="text-muted-foreground" size={dims.icon} />
          )}
        </span>
      </SwitchPrimitives.Root>
    );
  }
);

Switch.displayName = SwitchPrimitives.Root.displayName;
export { Switch };
