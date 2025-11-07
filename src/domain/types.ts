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

/**
 * Contract additions for Step 2 payload
 */
export type ModelFormat = 'glb' | 'gltf' | 'obj' | 'stl' | 'procedural';

export interface ModelCharacteristics {
  name?: string;
  format: ModelFormat;
  triangles?: number;
  materials?: number;
  sizeMB?: number;
  /**
   * Source where model was obtained from (AI, SVG, upload, preset).
   */
  source: 'ai' | 'svg' | 'upload' | 'preset';
  createdAt: number; // epoch ms
  /**
   * Optional canonical URL for the 3D asset.
   * - AI: proxied GLB url (/api/tripo/proxy?url=...)
   * - UPLOAD3D: object URL (best-effort, mainly for client reference)
   * - PRESETS/SVG: could be a generated download URL if available
   */
  url?: string | null;
}

export type NFCPrefs = {
  include: boolean;
  url?: string;
};

export type NewOrderPayload = {
  productType: ProductType;
  mode: SelectedMode;
  description?: string;
  /**
   * Quantity when applicable (AI/UPLOAD3D/PRESETS/SVG). ARTESANAL defaults to 1.
   */
  quantity?: number;

  /**
   * New NFC contract shape (kept alongside legacy includeNFC/nfcUrl for compatibility).
   */
  nfc: NFCPrefs;

  /**
   * Model technical details (triangles, materials, size, format, source, url).
   * Present when a model already exists in step 2 (AI/UPLOAD3D/PRESETS/SVG).
   */
  model?: ModelCharacteristics;

  /**
   * AI-specific references to link the generated asset.
   */
  ai?: {
    taskId?: string | null;
    glbUrl?: string | null;
    previewUrl?: string | null;
  };

  /**
   * PRESETS-specific reference (if applicable).
   */
  presetId?: string | null;

  /**
   * Optional SVG reference name (if applicable).
   */
  svgName?: string | null;

  /**
   * Quote information returned by /api/quote used for checkout continuity.
   */
  quote?: QuoteData;

  status: 'PENDIENTE_REVISION' | 'COTIZADO' | 'APROBADO' | 'PRODUCCION' | 'ENVIADO';
  createdAt: string; // ISO date string
};
