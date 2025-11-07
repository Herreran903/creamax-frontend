'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type Props = {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
  showHex?: boolean;
};

export function ColorInput({
  id,
  value,
  onChange,
  className,
  disabled = false,
  showHex = false,
}: Props) {
  const ref = React.useRef<HTMLInputElement>(null);

  // Local state to make the hex field controlled and always in sync with the prop.
  const [hex, setHex] = React.useState(value);
  React.useEffect(() => {
    setHex(value);
  }, [value]);

  const normalizeHex = (input: string): string | null => {
    let v = input.trim().toUpperCase();
    if (!v) return null;
    if (!v.startsWith('#')) v = `#${v}`;
    const valid = /^#([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/.test(v);
    if (!valid) return null;

    // Expand short hex (#RGB or #RGBA) to long form
    if (v.length === 4 || v.length === 5) {
      const body = v.slice(1);
      let out = '#';
      for (const ch of body) out += ch + ch;
      return out;
    }
    return v;
  };

  // Ensure a valid #RRGGBB for the native color input (drops alpha if present).
  const toHex6 = (input: string): string => {
    const n = normalizeHex(input);
    if (!n) return '#000000';
    const body = n.slice(1);
    if (body.length >= 6) {
      return `#${body.slice(0, 6)}`;
    }
    // Fallback (shouldn't happen due to normalize expansion).
    return `#${body.padEnd(6, '0').slice(0, 6)}`;
  };

  const handleNative = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Native color input always yields #RRGGBB (no alpha)
    onChange(e.target.value.toUpperCase());
  };

  const openPicker = () => {
    if (disabled) return;
    ref.current?.click();
  };

  const commitHex = (raw: string) => {
    const n = normalizeHex(raw);
    if (n) {
      setHex(n);
      onChange(n);
    } else {
      // Revert to last valid external value
      setHex(value);
    }
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHex(v);
    const n = normalizeHex(v);
    if (n) {
      setHex(n);
      onChange(n);
    }
  };

  const handleHexBlur = () => {
    commitHex(hex);
  };

  // Memoized value for the native input (must be #RRGGBB)
  const nativeValue = React.useMemo(() => toHex6(value), [value]);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-xl border-2 border-input bg-transparent',
        'px-2.5 py-2 transition-shadow focus-within:ring-1 focus-within:ring-[#125068]',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <button
        type="button"
        onClick={openPicker}
        aria-label="Elegir color"
        title={value}
        aria-disabled={disabled}
        className={cn(
          'relative h-9 w-11 rounded-xl shadow-sm overflow-hidden',
          disabled && 'pointer-events-none'
        )}
        style={{
          backgroundImage:
            'linear-gradient(45deg, rgba(0,0,0,.06) 25%, transparent 25%),' +
            'linear-gradient(-45deg, rgba(0,0,0,.06) 25%, transparent 25%),' +
            'linear-gradient(45deg, transparent 75%, rgba(0,0,0,.06) 75%),' +
            'linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.06) 75%)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
        }}
      >
        <span className="absolute inset-0 rounded-md" style={{ backgroundColor: value }} />
      </button>

      {true && (
        <Input
          type="text"
          inputMode="text"
          autoComplete="off"
          value={hex}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          spellCheck={false}
          className="flex-1 font-mono text-xs"
          placeholder="#7DD3FC"
          aria-label="Código de color en hexadecimal"
          disabled={disabled}
        />
      )}
      <input
        id={id}
        ref={ref}
        type="color"
        value={nativeValue}
        onChange={handleNative}
        className="sr-only"
        aria-hidden="true"
        disabled={disabled}
      />
    </div>
  );
}

export default ColorInput;
