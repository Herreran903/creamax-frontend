import type { Metadata } from 'next';
import { ReactQueryProvider } from '@/hooks/react-query-provider';
import { Toaster } from 'sonner';
import {
  Plus_Jakarta_Sans,
  Exo_2,
  Cabin_Sketch,
  Bungee_Shade,
  Londrina_Shadow,
} from 'next/font/google';
import BgTopo from '@/components/shared/display/bg-topo';
import './globals.css';

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const exo2 = Bungee_Shade({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

export const cabinSketch = Cabin_Sketch({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sketch',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Creamax',
  description: 'Plataforma de pedidos de impresión 3D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${plusJakarta.variable} ${exo2.variable} ${cabinSketch.variable} antialiased`}
      >
        <BgTopo />
        <div className="app-content">
          <ReactQueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ReactQueryProvider>
        </div>
      </body>
    </html>
  );
}
