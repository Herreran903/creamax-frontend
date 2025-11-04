import type { GenerationTask } from '@/domain/types';

export type GenerateOpts = { guidance?: number; seed?: number };

export interface IA3DProvider {
  generatePreview(prompt: string, images: File[], opts?: GenerateOpts): Promise<{ taskId: string }>;
  getTaskStatus(taskId: string): Promise<GenerationTask>;
  getAssetUrl(taskId: string): Promise<string | undefined>;
}

// Stub para desarrollo
export class Ai3DStubProvider implements IA3DProvider {
  async generatePreview(prompt: string, imgs: File[]) {
    const taskId = `task_${Math.random().toString(36).slice(2, 9)}`;
    // simular en server: /api/ai/preview
    await fetch('/api/ai/preview', { method: 'POST', body: JSON.stringify({ prompt }) });
    return { taskId };
  }
  async getTaskStatus(taskId: string) {
    const res = await fetch(`/api/ai/status?taskId=${taskId}`);
    return res.json();
  }
  async getAssetUrl(taskId: string) {
    const res = await this.getTaskStatus(taskId);
    return res.modelUrl;
  }
}
