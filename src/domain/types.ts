export type ProductType = 'LLAVERO' | 'IMAN_NEVERA' | 'FIGURA';

export interface Model3D {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  source: 'internal' | 'tripo';
  fileUrl: string;
  overlayImageUrl?: string;
  price?: number;
  nfc: boolean;
  status?: 'BORRADOR' | 'APROBADO' | 'EN_PRODUCCIÓN' | 'RECHAZADO';
}

export type Model3DLite = Pick<Model3D, 'id' | 'name' | 'price' | 'source'>;

export interface ModelPredesign3D extends Model3DLite {
  category: 'keychain' | 'magnet' | 'figure';
  kind: 'square' | 'rect' | 'circle';
}

export interface Quote {
  id: string;
  currency: 'USD' | 'COP';
  amount: number;
  estimateDays: number;
  includesNFC: boolean;
}

export interface Order {
  id: string;
  productType: ProductType;
  includeNFC: boolean;
  nfcUrl?: string;
  description: string;
  referenceImages: string[];
  modelId?: string;
  aiTaskId?: string;
  quote?: Quote;
  status: 'PENDIENTE_REVISION' | 'COTIZADO' | 'APROBADO' | 'PRODUCCION' | 'ENVIADO';
  trackingCode?: string;
  createdAt: string;
}

export interface GenerationTask {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  modelUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export type KeychainKind = 'square' | 'rect' | 'circle';

export type TDesign = {
  id: string;
  name: string;
  kind: KeychainKind;
  category: 'keychain';
};

export const PRESETS: TDesign[] = [
  { id: 'sq', name: 'Llavero Cuadrado', kind: 'square', category: 'keychain' },
  { id: 'rc', name: 'Llavero Rectangular', kind: 'rect', category: 'keychain' },
  { id: 'ci', name: 'Llavero Circular', kind: 'circle', category: 'keychain' },
];

export type ModelSourceTab = 'presets' | 'ai' | 'upload3d' | 'artisanal' | 'svg';
export const MODES = ['PRESETS', 'AI', 'UPLOAD3D', 'ARTESANAL', 'SVG'] as const;
export type SelectedMode = (typeof MODES)[number];

export type QuoteData = {
  amount: number;
  currency: string;
  estimateDays: number;
  modelOnly?: boolean;
};
