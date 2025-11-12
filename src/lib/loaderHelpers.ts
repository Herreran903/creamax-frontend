import * as THREE from 'three';

export async function loadFileToGroup(file: File): Promise<THREE.Group> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.stl')) {
    // dynamic import of STLLoader
    let STLLoader: any;
    try {
      const mod = await import('three/examples/jsm/loaders/STLLoader.js');
      STLLoader = (mod as any).STLLoader || (mod as any).default || (mod as any);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[loadFileToGroup] Failed to import STLLoader directly, trying alternative:', e);
      throw new Error('Unable to load STLLoader. Please ensure three package is installed.');
    }

    const loader = new STLLoader();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const geometry = loader.parse(arrayBuffer);

    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  throw new Error('Unsupported file type: ' + file.type + ' / ' + file.name);
}
