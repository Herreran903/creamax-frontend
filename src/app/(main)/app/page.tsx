'use client';

import { useRouter } from 'next/navigation';
import { useModels } from '@/hooks/data';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ModelCard } from '@/components/features/catalog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Images, Package, FileText } from 'lucide-react';

export default function AppHome() {
  const r = useRouter();
  const { data: models } = useModels();
  const [tab, setTab] = useState<'gallery' | 'shipping' | 'quotes'>('gallery');

  const easeCreamax: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

  const fadeUp = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeCreamax } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: easeCreamax } },
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as 'gallery' | 'shipping' | 'quotes')}
      orientation="vertical"
      className="h-full"
    >
      <div className="p-4 flex gap-6 md:gap-8 2xl:gap-10 xl:gap-10 justify-center h-full">
        <TabsList
          aria-orientation="vertical"
          className="inline-flex flex-col items-stretch gap-3 md:gap-4 shrink-0 rounded-2xl border-2 p-4 bg-white"
        >
          <TabsTrigger
            value="gallery"
            className="justify-start gap-3 rounded-2xl px-5 py-4 text-base"
            aria-controls="panel-gallery"
          >
            <Images size={18} strokeWidth={2.5} />
            <span className="font-extrabold tracking-wide">GALERÍA</span>
          </TabsTrigger>

          <TabsTrigger
            value="shipping"
            className="justify-start gap-3 rounded-2xl px-5 py-4 text-base"
            aria-controls="panel-shipping"
          >
            <Package size={18} strokeWidth={2.5} />
            <span className="font-extrabold tracking-wide">EN ENVÍO</span>
          </TabsTrigger>

          <TabsTrigger
            value="quotes"
            className="justify-start gap-3 rounded-2xl px-5 py-4 text-base"
            aria-controls="panel-quotes"
          >
            <FileText size={18} strokeWidth={2.5} />
            <span className="font-extrabold tracking-wide">COTIZACIONES</span>
          </TabsTrigger>
        </TabsList>

        <section className="flex-1 min-w-0 flex flex-col justify-start">
          <TabsContent value="gallery" id="panel-gallery" role="tabpanel">
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
                      'grid-cols-[repeat(auto-fit,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]'
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
          </TabsContent>

          <TabsContent value="shipping" id="panel-shipping" role="tabpanel">
            Proximamente
          </TabsContent>

          <TabsContent value="quotes" id="panel-quotes" role="tabpanel">
            Proximamente
          </TabsContent>
        </section>
      </div>
    </Tabs>
  );
}
