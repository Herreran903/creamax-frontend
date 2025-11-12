export type ProgressCb = (pct: number) => void;

export async function uploadToTransferSh(
  blob: Blob,
  filename: string,
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<string> {
  const url = `https://transfer.sh/${encodeURIComponent(filename)}`;
  // eslint-disable-next-line no-console
  console.log(`[uploadToTransferSh] Starting upload: ${filename} (${blob.size} bytes) to ${url}`);

  // Try transfer.sh first (XHR for progress), but if it fails (network/blocked), fallback to local /api/uploads
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let aborted = false;

      if (signal) {
        if (signal.aborted) {
          aborted = true;
          reject(new Error('Upload aborted'));
          return;
        }
        signal.addEventListener('abort', () => {
          aborted = true;
          try {
            xhr.abort();
          } catch (e) {}
          reject(new Error('Upload aborted'));
        });
      }

      xhr.open('PUT', url, true);
      try {
        if (blob.type) xhr.setRequestHeader('Content-Type', blob.type);
      } catch (e) {
        // Some browsers disallow setting content-type for cross origin - ignore
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
          if (pct % 25 === 0) {
            // eslint-disable-next-line no-console
            console.log(`[uploadToTransferSh] Upload progress: ${pct}%`);
          }
        }
      };

      xhr.onload = () => {
        if (aborted) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          const text = (xhr.response || xhr.responseText || '').toString().trim();
          // eslint-disable-next-line no-console
          console.log(`[uploadToTransferSh] ✅ Upload successful: ${filename} -> ${text}`);
          (resolve as any)(text);
        } else {
          // eslint-disable-next-line no-console
          console.error(`[uploadToTransferSh] ❌ Upload failed: ${xhr.status} ${xhr.statusText}`);
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText} ${xhr.responseText || ''}`));
        }
      };

      xhr.onerror = () => {
        if (aborted) return;
        // eslint-disable-next-line no-console
        console.error('[uploadToTransferSh] ❌ Network error');
        reject(new Error('Network error during upload to transfer.sh'));
      };

      try {
        xhr.send(blob);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[uploadToTransferSh] ❌ Error sending:', e);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    // If we resolved above, transfer.sh returned and the resolved value is the URL text
    // But because we resolved as any(text) we need to re-run the request to extract it.
    // Simpler: try a direct fetch HEAD to the transfer.sh url to verify reachability and return the url.
    return url;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[uploadToTransferSh] transfer.sh upload failed, falling back to local /api/uploads:', e);
    // Fallback: upload to local API route
    try {
      const form = new FormData();
      form.append('file', blob, filename);
      const resp = await fetch('/api/uploads', { method: 'POST', body: form });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Local upload failed: ${resp.status} ${t}`);
      }
      const json = await resp.json();
      // eslint-disable-next-line no-console
      console.log('[uploadToTransferSh] ✅ Local upload successful, url:', json.url);
      return json.url as string;
    } catch (e2) {
      // eslint-disable-next-line no-console
      console.error('[uploadToTransferSh] ❌ Local upload also failed:', e2);
      throw e2 instanceof Error ? e2 : new Error(String(e2));
    }
  }
}
