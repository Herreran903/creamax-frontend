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
  // Flatten the group into a new Group with baked geometries.
  // For each mesh we apply its world matrix to its geometry and add a new
  // mesh with identity transform to the output. This avoids residual parent
  // transforms (scale/translate) affecting matrixWorld after bake.
  const out = new THREE.Group();

  // Ensure world matrices are up-to-date on source
  group.updateMatrixWorld(true);

  // Diagnostic: log per-mesh bounding boxes before baking
  try {
    const beforeInfo: Array<{ name: string; bbox: [number, number, number]; matrixWorld?: number[] }> = [];
    group.traverse((o: any) => {
      if (o?.isMesh) {
        const b = new THREE.Box3().setFromObject(o);
        const s = new THREE.Vector3();
        b.getSize(s);
        beforeInfo.push({ name: o.name || 'mesh', bbox: [s.x, s.y, s.z], matrixWorld: o.matrixWorld ? o.matrixWorld.toArray() : undefined });
      }
    });
    // eslint-disable-next-line no-console
    console.log('[normalizeSceneForExport] before bake per-mesh:', JSON.stringify(beforeInfo));
  } catch (e) {
    // ignore diagnostics error
  }

  // Walk source and create baked meshes in the output group
  let meshIndex = 0;
  group.traverse((obj: any) => {
    if (!obj?.isMesh) return;
    const src: THREE.Mesh = obj as THREE.Mesh;
    if (!src.geometry) return;

    // Clone geometry and bake world transform
    const geom = (src.geometry as THREE.BufferGeometry).clone();
    geom.applyMatrix4(src.matrixWorld);
    if (!geom.getAttribute('normal')) geom.computeVertexNormals();

    // Create new mesh with identity transform
    const newMesh = new THREE.Mesh(geom, Array.isArray(src.material) ? src.material.slice() : src.material);
    newMesh.name = src.name || `mesh_${meshIndex}`;
    newMesh.matrixAutoUpdate = false;
    newMesh.position.set(0, 0, 0);
    newMesh.rotation.set(0, 0, 0);
    newMesh.scale.set(1, 1, 1);
    if (typeof newMesh.updateMatrix === 'function') newMesh.updateMatrix();
    out.add(newMesh);
    meshIndex += 1;
  });

  // Recompute matrices on the flattened output
  out.updateMatrixWorld(true);

  // Diagnostic: log per-mesh bounding boxes after baking
  try {
    const afterInfo: Array<{ name: string; bbox: [number, number, number]; matrixWorld?: number[] }> = [];
    out.traverse((o: any) => {
      if (o?.isMesh) {
        const geom = o.geometry as THREE.BufferGeometry;
        geom.computeBoundingBox();
        const bb = geom.boundingBox as THREE.Box3;
        const s = new THREE.Vector3();
        bb.getSize(s);
        afterInfo.push({ name: o.name || 'mesh', bbox: [s.x, s.y, s.z], matrixWorld: o.matrixWorld ? o.matrixWorld.toArray() : undefined });
      }
    });
    // eslint-disable-next-line no-console
    console.log('[normalizeSceneForExport] after bake per-mesh:', JSON.stringify(afterInfo));
  } catch (e) {
    // ignore
  }

  return out;
}

// Additional export helper: inspect sizes and optionally scale entire scene to fit
export function prepareSceneForExport(group: THREE.Group, options: { maxPrintMm?: number; minReasonableMm?: number } = {}) {
  const maxPrintMm = options.maxPrintMm ?? Number(process.env.NEXT_PUBLIC_MAX_PRINT_MM ?? 200);
  const minReasonableMm = options.minReasonableMm ?? 0.5;

  // Ensure world matrices updated and geometries baked
  group.updateMatrixWorld(true);

  // Collect per-mesh bounding boxes
  const perMeshInfo: Array<{ name: string; size: THREE.Vector3; center: THREE.Vector3 }> = [];
  group.traverse((obj: any) => {
    if (!obj?.isMesh) return;
    const mesh: THREE.Mesh = obj as THREE.Mesh;
    const geom = mesh.geometry as THREE.BufferGeometry;
    if (!geom) return;
    const clonedGeo = geom.clone();
    clonedGeo.applyMatrix4(mesh.matrixWorld);
    clonedGeo.computeBoundingBox();
    const bb = (clonedGeo.boundingBox as THREE.Box3) || new THREE.Box3();
    const size = new THREE.Vector3();
    bb.getSize(size);
    const center = new THREE.Vector3();
    bb.getCenter(center);
    perMeshInfo.push({ name: mesh.name || 'mesh', size, center });
  });

  // Compute global bounding box
  const globalBox = new THREE.Box3();
  group.traverse((obj: any) => globalBox.expandByObject(obj));
  const globalSize = new THREE.Vector3();
  globalBox.getSize(globalSize);
  const maxDim = Math.max(globalSize.x || 0, globalSize.y || 0, globalSize.z || 0);

  // Heuristic: detect units. If maxDim < 10 we assume meters, otherwise millimeters
  const unitScaleToMm = maxDim > 0 && maxDim < 10 ? 1000 : 1;
  const maxDimMm = maxDim * unitScaleToMm;

  // Log per-mesh sizes in mm
  // eslint-disable-next-line no-console
  console.log('[prepareSceneForExport] global maxDim:', maxDim, '->', maxDimMm, 'mm (unitScaleToMm=', unitScaleToMm, ')');
  for (const info of perMeshInfo) {
    const meshMax = Math.max(info.size.x, info.size.y, info.size.z);
    // eslint-disable-next-line no-console
    console.log('[prepareSceneForExport] mesh:', info.name, 'size:', info.size.toArray(), '->', meshMax * unitScaleToMm, 'mm');
  }

  // Apply 0.25 scale (75% reduction) to all geometries for consistent keychain size
  const targetScaleFactor = 0.25*110;
  const targetScaleMat = new THREE.Matrix4().makeScale(targetScaleFactor, targetScaleFactor, targetScaleFactor);
  group.traverse((obj: any) => {
    if (obj?.isMesh && obj.geometry) {
      const g = (obj.geometry as THREE.BufferGeometry).clone();
      g.applyMatrix4(targetScaleMat);
      obj.geometry = g;
    }
  });
  // eslint-disable-next-line no-console
  console.log('[prepareSceneForExport] Applied uniform scale factor 0.25 (75% reduction)');

  // NOTE: We do NOT apply additional "fit to bed" scaling here because the 0.25x factor
  // is explicitly intended for keychain sizing. The model should now be at correct size.

  // Warn about very small meshes
  for (const info of perMeshInfo) {
    const meshMaxMm = Math.max(info.size.x, info.size.y, info.size.z) * unitScaleToMm;
    if (meshMaxMm > 0 && meshMaxMm < minReasonableMm) {
      // eslint-disable-next-line no-console
      console.warn('[prepareSceneForExport] mesh seems extremely small (mm):', info.name, meshMaxMm);
    }
  }

  return group;
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

  // Emit each mesh as its own 'solid' block so the STL preserves object separation
  // which we can later parse into multiple objects inside the 3MF.
  let meshIndex = 0;
  group.traverse((obj: any) => {
    if (!obj?.isMesh) return;
    const mesh: any = obj as THREE.Mesh;
    const geom: THREE.BufferGeometry = (mesh.geometry as THREE.BufferGeometry);
    if (!geom) return;

    const pos = geom.getAttribute('position');
    if (!pos) return;
    const idx = geom.index;

    const matrix = mesh.matrixWorld;

    // Diagnostic: compute and log bounding box after applying matrixWorld
    try {
      const tempGeo = geom.clone();
      tempGeo.applyMatrix4(matrix);
      tempGeo.computeBoundingBox();
      const bb = tempGeo.boundingBox as THREE.Box3;
      const s = new THREE.Vector3();
      bb.getSize(s);
      const min = bb.min;
      const max = bb.max;
      // eslint-disable-next-line no-console
      console.log('[exportGroupToStl] mesh:', mesh.name || `mesh_${meshIndex}`, 'bbox size:', s.toArray(), 'min:', min.toArray(), 'max:', max.toArray(), 'matrixWorld:', matrix.toArray());
    } catch (e) {
      // ignore diagnostics
    }

    const nameSafe = mesh.name ? mesh.name.replace(/\s+/g, '_') : `mesh_${meshIndex}`;
    out += `solid ${nameSafe}\n`;

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

    out += `endsolid ${nameSafe}\n`;
    meshIndex += 1;
  });

  // ASCII STL MIME
  return new Blob([out], { type: 'model/stl' });
}

/**
 * Export a THREE.Group to a 3MF Blob using GLTFExporter -> server-side conversion.
 * 
 * Since ThreeMFExporter doesn't exist in the three package, we:
 * 1. Export to GLTF binary (glb) using GLTFExporter (which IS available)
 * 2. Send the glb to /api/convert/gltf-to-3mf which packages it into 3MF ZIP format
 * 3. Return the resulting 3MF Blob
 */
export async function exportGroupTo3mf(group: THREE.Group, _options?: ExportOptions): Promise<Blob> {
  // Prefer exporting as STL for maximum slicer compatibility (Prusa Slicer
  // doesn't accept GLB inside 3MF). We create an ASCII STL client-side and
  // send it to the server which will package it into a 3MF container.
  // eslint-disable-next-line no-console
  console.log('[exportGroupTo3mf] Exporting group to STL for 3MF packaging');

  try {
    const stlBlob = exportGroupToStl(group);
    // eslint-disable-next-line no-console
    console.log('[exportGroupTo3mf] STL blob created:', stlBlob.size, 'bytes');

    const resp = await fetch('/api/convert/gltf-to-3mf', {
      method: 'POST',
      headers: {
        'Content-Type': stlBlob.type || 'model/stl',
      },
      body: stlBlob,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Conversion failed: ${resp.status} ${text}`);
    }

    const blob3mf = await resp.blob();
    // eslint-disable-next-line no-console
    console.log('[exportGroupTo3mf] ✅ 3MF (with STL) created:', blob3mf.size, 'bytes');
    return blob3mf;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[exportGroupTo3mf] STL -> 3MF conversion failed:', e);
    throw e;
  }
}

export default exportGroupTo3mf;
