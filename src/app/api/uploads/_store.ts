/**
 * Simple in-memory upload store for dev/staging.
 * NOTE: This is NOT persistent across server restarts or serverless cold starts.
 * For production, replace with durable storage (S3, Cloudinary, etc).
 */
export type UploadRecord = {
  id: string;
  buffer: Buffer;
  contentType: string;
  filename: string;
  createdAt: number;
};

const store = new Map<string, UploadRecord>();

export function putUpload(rec: UploadRecord) {
  store.set(rec.id, rec);
}

export function getUpload(id: string) {
  return store.get(id) || null;
}

export function removeOldUploads(maxAgeMs = 1000 * 60 * 60) {
  const now = Date.now();
  for (const [id, rec] of store) {
    if (now - rec.createdAt > maxAgeMs) {
      store.delete(id);
    }
  }
}
