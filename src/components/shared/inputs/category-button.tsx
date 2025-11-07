import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as React from 'react';

type CategoryItemProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  hint?: string;
  onClick?: () => void;
};

export default function CategoryItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  hint,
  onClick,
}: CategoryItemProps) {
  return (
    <div className="relative">
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-xl bg-[#0B4D67]/90"
        />
      )}
      <Button
        type="button"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        role="option"
        aria-selected={active}
        className={cn(
          'relative z-10 w-full justify-start px-3 py-2 rounded-xl transition-colors',
          'bg-white! text-foreground',
          active ? 'border-2 border-[#0B4D67]' : 'border-border hover:border-foreground/40',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span className="font-semibold">{label}</span>
        {hint && (
          <span className="ml-auto text-[10px] uppercase tracking-wide opacity-70">{hint}</span>
        )}
      </Button>
    </div>
  );
}
