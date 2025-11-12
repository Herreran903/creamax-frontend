import * as THREE from 'three';

export type NormalizeOptions = {
  scaleToMm?: boolean; // scale units to millimeters
};

/**
 * Clone and normalize a Group for export:
 * - Clones the group
 * - Applies world matrices into geometries
 * - Optionally scales to millimeters (assumes current units are meters)
 */
export function normalizeSceneForExport(group: THREE.Group, options: NormalizeOptions = {}): THREE.Group {
  const { scaleToMm = true } = options;
  const cloned = group.clone(true) as THREE.Group;

  // Ensure world matrices have been updated
  cloned.updateMatrixWorld(true);

  // Traverse and bake transforms into geometry
  cloned.traverse((obj: any) => {
    if (obj?.isMesh) {
      const mesh = obj as THREE.Mesh;
      const geometry = (mesh.geometry as THREE.BufferGeometry).clone();

      // Apply world transform to geometry
      geometry.applyMatrix4(mesh.matrixWorld);

      // If scaling to mm, apply uniform scale
      if (scaleToMm) {
        const scale = new THREE.Matrix4().makeScale(1000, 1000, 1000);
        geometry.applyMatrix4(scale);
      }

      // Reset mesh transform
      mesh.matrixAutoUpdate = false;
      mesh.matrix.identity();
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);

      mesh.geometry = geometry;
      // ensure normals
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    }
  });

  return cloned;
}

// Helper to convert exporter result to Blob
export function parseExportResultToBlob(result: ArrayBuffer | Uint8Array | string): Blob {
  if (typeof result === 'string') {
    return new Blob([result], { type: 'application/vnd.ms-3mf' });
  }
  if (result instanceof ArrayBuffer) {
    return new Blob([new Uint8Array(result)], { type: 'application/vnd.ms-3mf' });
  }
  if (result instanceof Uint8Array) {
    // Cast to any to avoid TypeScript issues with ArrayBuffer type compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Blob([(result as any)], { type: 'application/vnd.ms-3mf' });
  }
  // Fallback
  return new Blob([], { type: 'application/vnd.ms-3mf' });
}

export type ExportOptions = {
  // reserved for future
};

/**
 * Simple ASCII STL exporter fallback.
 * Walks meshes in the group and emits triangle facets.
 */
export function exportGroupToStl(group: THREE.Group): Blob {
  // eslint-disable-next-line no-console
  console.log('[exportGroupToStl] Starting STL export fallback');

  group.updateMatrixWorld(true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let out = '';
  out += 'solid exported\n';

  group.traverse((obj: any) => {
    if (!obj?.isMesh) return;
    const mesh: any = obj as THREE.Mesh;
    const geom: THREE.BufferGeometry = (mesh.geometry as THREE.BufferGeometry);
    if (!geom) return;

    const pos = geom.getAttribute('position');
    if (!pos) return;
    const idx = geom.index;

    const matrix = mesh.matrixWorld;

    const pushVertex = (v: THREE.Vector3) => `${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`;

    if (idx) {
      const indexArray: any = idx.array;
      for (let i = 0; i < indexArray.length; i += 3) {
        const ia = indexArray[i];
        const ib = indexArray[i + 1];
        const ic = indexArray[i + 2];
        a.fromBufferAttribute(pos, ia).applyMatrix4(matrix);
        b.fromBufferAttribute(pos, ib).applyMatrix4(matrix);
        c.fromBufferAttribute(pos, ic).applyMatrix4(matrix);
        ab.subVectors(b, a);
        ac.subVectors(c, a);
        normal.copy(ab.cross(ac)).normalize();

        out += ` facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
        out += '  outer loop\n';
        out += `   vertex ${pushVertex(a)}\n`;
        out += `   vertex ${pushVertex(b)}\n`;
        out += `   vertex ${pushVertex(c)}\n`;
        out += '  endloop\n';
        out += ' endfacet\n';
      }
    } else {
      const vCount = pos.count;
      for (let i = 0; i < vCount; i += 3) {
        a.fromBufferAttribute(pos, i).applyMatrix4(matrix);
        b.fromBufferAttribute(pos, i + 1).applyMatrix4(matrix);
        c.fromBufferAttribute(pos, i + 2).applyMatrix4(matrix);
        ab.subVectors(b, a);
        ac.subVectors(c, a);
        normal.copy(ab.cross(ac)).normalize();

        out += ` facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
        out += '  outer loop\n';
        out += `   vertex ${pushVertex(a)}\n`;
        out += `   vertex ${pushVertex(b)}\n`;
        out += `   vertex ${pushVertex(c)}\n`;
        out += '  endloop\n';
        out += ' endfacet\n';
      }
    }
  });

  out += 'endsolid exported\n';

  // ASCII STL MIME
  return new Blob([out], { type: 'model/stl' });
}

/**
 * Export a THREE.Group to a 3MF Blob using the ThreeMFExporter from examples.
 * Dynamically imports the exporter to avoid bundling it in the main bundle.
 */
export async function exportGroupTo3mf(group: THREE.Group, _options?: ExportOptions): Promise<Blob> {
  // eslint-disable-next-line no-console
  console.log('[exportGroupTo3mf] Starting export...');

  // dynamic import to keep bundle small
  // Use a try-catch because bundlers like Turbopack may not resolve three/examples paths at build time
  let ThreeMFExporter: any;
  try {
    // Try direct import first
    // @ts-expect-error - three/examples paths may not be resolvable at build time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('three/examples/jsm/exporters/3MFExporter.js');
    ThreeMFExporter = (mod as any).ThreeMFExporter || (mod as any).default || (mod as any);
  } catch (e) {
    // If that fails, try accessing from three module dynamically
    // eslint-disable-next-line no-console
    console.warn('[exportGroupTo3mf] Failed to import 3MFExporter directly, trying alternative path:', e);
    try {
      // Fallback: this may work depending on bundler
      const three = await import('three');
      // @ts-ignore - accessing undocumented path
      const mod = (three as any).examples?.jsm?.exporters?.ThreeMFExporter;
      if (mod) {
        ThreeMFExporter = mod;
      } else {
        throw new Error('3MFExporter not found in three module');
      }
    } catch (e2) {
      // eslint-disable-next-line no-console
      console.error('[exportGroupTo3mf] Failed to load 3MFExporter:', e2);
      // Fallback: try to export to STL (simple ASCII exporter) instead of failing completely
      console.warn('[exportGroupTo3mf] Falling back to STL exporter');
      try {
        const stlBlob = exportGroupToStl(group);
        return stlBlob;
      } catch (stlErr) {
        console.error('[exportGroupTo3mf] STL fallback also failed:', stlErr);
        throw new Error('Unable to load 3MFExporter or export to STL. Please ensure three package is installed.');
      }
    }
  }

  const exporter = new ThreeMFExporter();

  // eslint-disable-next-line no-console
  console.log('[exportGroupTo3mf] 3MFExporter loaded');

  return new Promise<Blob>((resolve, reject) => {
    try {
      const result = exporter.parse(group, (res: any) => {
        try {
          // eslint-disable-next-line no-console
          console.log('[exportGroupTo3mf] Exporter callback received, result type:', typeof res, res instanceof Uint8Array ? 'Uint8Array' : res instanceof ArrayBuffer ? 'ArrayBuffer' : 'other');
          const blob = parseExportResultToBlob(res);
          // eslint-disable-next-line no-console
          console.log('[exportGroupTo3mf] ✅ Blob created, size:', blob.size, 'bytes');
          resolve(blob);
        } catch (e) {
          reject(e);
        }
      });

      // If parse returned synchronously
      if (result) {
        try {
          // eslint-disable-next-line no-console
          console.log('[exportGroupTo3mf] Synchronous result received, type:', typeof result, result instanceof Uint8Array ? 'Uint8Array' : result instanceof ArrayBuffer ? 'ArrayBuffer' : 'other');
          const blob = parseExportResultToBlob(result as any);
          // eslint-disable-next-line no-console
          console.log('[exportGroupTo3mf] ✅ Blob created (sync), size:', blob.size, 'bytes');
          resolve(blob);
        } catch (e) {
          reject(e);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[exportGroupTo3mf] ❌ Export error:', e);
      reject(e);
    }
  });
}

export default exportGroupTo3mf;
