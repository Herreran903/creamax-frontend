'use client';

import { useRouter } from 'next/navigation';
import { useModels } from '@/hooks/data';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import MetroToggle from '@/components/shared/inputs/metro-toggle';
import { ModelCard } from '@/components/features/catalog';

const options = ['Galería', 'En envío'];

export default function AppHome() {
  const r = useRouter();
  const { data: models } = useModels();
  const [tab, setTab] = useState<'gallery' | 'shipping'>('gallery');

  const easeCreamax: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

  const fadeUp = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeCreamax } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: easeCreamax } },
  };

  return (
    <>
      <div className="p-4 flex gap-6 md:gap-8 2xl:gap-10 xl:gap-10 justify-center h-full">
        <MetroToggle value={tab} onChange={setTab} />
        <section className="flex-1 min-w-0 flex flex-col justify-center">
          {tab === 'gallery' ? (
            <div id="panel-gallery" role="tabpanel">
              <AnimatePresence mode="wait">
                <motion.div
                  key="tab-gallery"
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {models?.length ? (
                    <motion.div
                      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                      initial="initial"
                      animate="animate"
                      className={cn(
                        'grid gap-4 justify-center',
                        'grid-cols-[repeat(auto-fit,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]'
                      )}
                    >
                      {models.map((m) => (
                        <motion.div
                          key={m.id}
                          variants={{
                            initial: { opacity: 0, y: 6 },
                            animate: { opacity: 1, y: 0 },
                          }}
                        >
                          <ModelCard m={m} onOpen={(id) => r.push(`/app/models/${id}`)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-center text-muted-foreground text-sm">
                          No tienes modelos aún
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div id="panel-shipping" role="tabpanel">
              Proximamente
            </div>
          )}
        </section>
      </div>
    </>
  );
}
