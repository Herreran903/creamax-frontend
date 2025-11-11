// src/hooks/use-order.tsx
'use client';
import * as React from 'react';
import type { ModelSourceTab, SelectedMode, QuoteData } from '@/domain/types';

export type TStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | null;

export const POLL_BASE_MS = 2500;
export const POLL_MAX_MS = 10000;
export const MAX_WAIT_MS = 120000;

type Ctx = {
  // paso
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;

  // tabs / modo
  activeTab: ModelSourceTab;
  setActiveTab: (t: ModelSourceTab) => void;
  selectedMode: SelectedMode;
  setSelectedMode: (m: SelectedMode) => void;

  // presets
  category: 'keychain';
  setCategory: (c: 'keychain') => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  presetOverlay: string | null;
  setPresetOverlay: (s: string | null) => void;

  // upload
  uploadedUrl: string | null;
  setUploadedUrl: (u: string | null) => void;
  uploadedName: string | null;
  setUploadedName: (s: string | null) => void;

  // IA
  prompt: string;
  setPrompt: (s: string) => void;
  imageUrl: string;
  setImageUrl: (s: string) => void;
  imagePreview: string | null;
  setImagePreview: (s: string | null) => void;
  taskId: string | null;
  setTaskId: (s: string | null) => void;
  status: TStatus;
  setStatus: (s: TStatus) => void;
  progress: number | null;
  setProgress: (n: number | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (s: string | null) => void;
  glbUrl: string | null;
  setGlbUrl: (s: string | null) => void;
  aiArtisan: boolean;
  setAiArtisan: (b: boolean) => void;
  aiArtisanNotes: string;
  setAiArtisanNotes: (s: string) => void;

  // artesanal
  artisanDescription: string;
  setArtisanDescription: (s: string) => void;
  artisanImageUrls: string[];
  setArtisanImageUrls: (l: string[]) => void;

  // paso 2
  includeNfc: boolean;
  setIncludeNfc: (b: boolean) => void;
  nfcUrl: string;
  setNfcUrl: (s: string) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  notes: string;
  setNotes: (s: string) => void;

  customName: string;
  setCustomName: (s: string) => void;

  /**
   * If a texture image was selected in presets, store its URL for contract building.
   */
  textureImageUrl: string | null;
  setTextureImageUrl: (u: string | null) => void;

  quoteData: QuoteData | null;
  setQuoteData: (q: QuoteData | null) => void;
  /**
   * Full API quote response from POST /api/v1/custom/create
   * Persisted for later steps reuse.
   */
  quoteResponse: any | null;
  setQuoteResponse: (q: any | null) => void;

  /**
   * When PRESETS is built from an SVG, keep the raw SVG text to send in the contract.
   */
  svgText: string | null;
  setSvgText: (s: string | null) => void;

  baseColor: string;
  setBaseColor: (s: string) => void;
  borderColor: string;
  setBorderColor: (s: string) => void;

  // flags
  isPresets: boolean;
  isAI: boolean;
  isUpload3D: boolean;
  isArtisanal: boolean;
  canContinue: boolean;

  resetIaState: () => void;
};

const OrderContext = React.createContext<Ctx | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = React.useState<ModelSourceTab>('presets');
  const [selectedMode, setSelectedMode] = React.useState<SelectedMode>('PRESETS');

  const [category, setCategory] = React.useState<'keychain'>('keychain');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [presetOverlay, setPresetOverlay] = React.useState<string | null>(null);

  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);

  const [prompt, setPrompt] = React.useState('low-poly red sports car');
  const [imageUrl, setImageUrl] = React.useState('');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<TStatus>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [glbUrl, setGlbUrl] = React.useState<string | null>(null);
  const [aiArtisan, setAiArtisan] = React.useState(false);
  const [aiArtisanNotes, setAiArtisanNotes] = React.useState('');

  const [artisanDescription, setArtisanDescription] = React.useState('');
  const [artisanImageUrls, setArtisanImageUrls] = React.useState<string[]>([]);

  const [includeNfc, setIncludeNfc] = React.useState(true);
  const [nfcUrl, setNfcUrl] = React.useState('');
  const [quantity, setQuantity] = React.useState<number>(50);
  const [notes, setNotes] = React.useState('');
  const [customName, setCustomName] = React.useState<string>('');
  const [textureImageUrl, setTextureImageUrl] = React.useState<string | null>(null);
  const [quoteData, setQuoteData] = React.useState<QuoteData | null>(null);
  const [quoteResponse, setQuoteResponse] = React.useState<any | null>(null);
  const [svgText, setSvgText] = React.useState<string | null>(null);
  const [baseColor, setBaseColor] = React.useState<string>('#7dd3fc');
  const [borderColor, setBorderColor] = React.useState<string>('#7dd3fc');

  const isPresets = selectedMode === 'PRESETS';
  const isAI = selectedMode === 'AI';
  const isUpload3D = selectedMode === 'UPLOAD3D';
  const isArtisanal = selectedMode === 'ARTESANAL';

  const canContinue =
    activeTab === 'ai'
      ? Boolean(glbUrl)
      : activeTab === 'upload3d'
        ? Boolean(uploadedUrl)
        : activeTab === 'artisanal'
          ? artisanDescription.trim().length >= 10 || artisanImageUrls.length > 0
          : Boolean(selected);

  const resetIaState = React.useCallback(() => {
    setGlbUrl(null);
    setPreviewUrl(null);
    setProgress(null);
    setStatus(null);
  }, []);

  const value: Ctx = {
    step,
    setStep: (s) => {
      if (s === 2) {
        const m: SelectedMode =
          activeTab === 'artisanal'
            ? 'ARTESANAL'
            : activeTab === 'ai'
              ? 'AI'
              : activeTab === 'upload3d'
                ? 'UPLOAD3D'
                : 'PRESETS';
        setSelectedMode(m);
      }
      setStep(s);
    },
    activeTab,
    setActiveTab,
    selectedMode,
    setSelectedMode,
    category,
    setCategory,
    selected,
    setSelected,
    presetOverlay,
    setPresetOverlay,
    uploadedUrl,
    setUploadedUrl,
    uploadedName,
    setUploadedName,
    prompt,
    setPrompt,
    imageUrl,
    setImageUrl,
    imagePreview,
    setImagePreview,
    taskId,
    setTaskId,
    status,
    setStatus,
    progress,
    setProgress,
    previewUrl,
    setPreviewUrl,
    glbUrl,
    setGlbUrl,
    aiArtisan,
    setAiArtisan,
    aiArtisanNotes,
    setAiArtisanNotes,
    artisanDescription,
    setArtisanDescription,
    artisanImageUrls,
    setArtisanImageUrls,
    includeNfc,
    setIncludeNfc,
    nfcUrl,
    setNfcUrl,
    quantity,
    setQuantity,
    notes,
    setNotes,
    customName,
    setCustomName,
    quoteData,
    setQuoteData,
    textureImageUrl,
    setTextureImageUrl,
    quoteResponse,
    setQuoteResponse,
    svgText,
    setSvgText,
    baseColor,
    setBaseColor,
    borderColor,
    setBorderColor,
    isPresets,
    isAI,
    isUpload3D,
    isArtisanal,
    canContinue,
    resetIaState,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = React.useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
