'use client';

import { motion, Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Home, Plus } from 'lucide-react';

const easeCreamax: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const brandLetters = 'CREAMAX'.split('');

const letterVar: Variants = {
  rest: { y: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  hover: (i: number) => ({
    y: [-1, -3, -1, 0],
    rotate: [0, -2, 1, 0],
    scaleX: [1, 1.03, 0.98, 1],
    scaleY: [1, 0.96, 1.02, 1],
    transition: {
      duration: 0.55,
      ease: [0.45, 0, 0.25, 1],
      delay: i * 0.035,
    },
  }),
};

function BrandTitle() {
  return (
    <motion.h1
      className="font-display text-5xl tracking-tight select-none"
      initial={{ y: 6, scale: 0.98, opacity: 1 }}
      animate={{
        y: 0,
        scale: 1,
        opacity: 1,
        transition: { type: 'spring', stiffness: 160, damping: 18, mass: 0.5, delay: 0.05 },
      }}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {brandLetters.map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          custom={i}
          variants={letterVar}
          initial="rest"
          animate="rest"
          whileHover="hover"
          style={{ transformOrigin: '50% 100%' }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.h1>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const r = useRouter();

  return (
    <div className="min-h-screen font-sans text-foreground bg-background">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: easeCreamax } }}
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-background/70 backdrop-blur-sm border-b border-border isolate"
      >
        <motion.button
          type="button"
          onClick={() => r.push('/app')}
          className="group inline-flex items-center gap-2 will-change-transform"
          aria-label="Ir al inicio"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
        >
          <BrandTitle />
        </motion.button>

        <nav className="flex items-center gap-3">
          <Button
            onClick={() => r.push('/app/orders/new')}
            aria-label="Nuevo pedido"
            className="
              rounded-xl
              px-6 py-7
              text-base font-extrabold
              text-white
              bg-[#FF4D00]
            "
            variant="default"
          >
            <Plus size={20} strokeWidth={5} />
            <span>NUEVO PEDIDO</span>
          </Button>
          <Button
            onClick={() => r.push('/app')}
            aria-label="Ir al inicio"
            className="
              px-5 py-7
              rounded-xl
              border-2 border-foreground/40 
              bg-background/70 
              text-foreground 
            "
          >
            <Home size={24} strokeWidth={2.5} />
          </Button>
          <motion.div
            whileHover={{ y: -1, boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="rounded-full"
          >
            <Avatar className="h-15 w-15 ring-1 ring-black/10 dark:ring-white/10 bg-amber-500">
              <AvatarImage
                src="https://api.dicebear.com/9.x/fun-emoji/svg?seed=creamax"
                alt="Avatar usuario"
              />
              <AvatarFallback>CU</AvatarFallback>
            </Avatar>
          </motion.div>
        </nav>
      </motion.header>

      <Separator />
      <main className="h-[calc(100vh-100px)] py-4 px-10">{children}</main>
    </div>
  );
}
