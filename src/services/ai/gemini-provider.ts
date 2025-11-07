import type { IA3DProvider, GenerateOpts } from './provider';
import type { GenerationTask } from '@/domain/types';

export class Gemini3DProvider implements IA3DProvider {
  constructor(private apiKey: string) {}
  async generatePreview(prompt: string, images: File[], opts?: GenerateOpts) {
    // Llamar a tu backend que orquesta Gemini u otro proveedor y devuelve taskId
    const r = await fetch('/api/ai/gemini/preview', {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
      body: JSON.stringify({ prompt, opts }),
    });
    return r.json();
  }
  async getTaskStatus(taskId: string): Promise<GenerationTask> {
    const r = await fetch(`/api/ai/gemini/status?taskId=${taskId}`, {
      headers: { 'x-api-key': this.apiKey },
    });
    return r.json();
  }
  async getAssetUrl(taskId: string) {
    const s = await this.getTaskStatus(taskId);
    return s.modelUrl;
  }
}
