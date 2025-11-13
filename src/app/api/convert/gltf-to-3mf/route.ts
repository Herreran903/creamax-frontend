import { NextResponse } from 'next/server';
import archiver from 'archiver';

// Lazy load THREE.js only when needed (server-side)
let THREE: any = null;
function getThree() {
  if (!THREE) {
    THREE = require('three');
  }
  return THREE;
}

function createContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/3D/model.xml" ContentType="application/vnd.ms-3mf.model+xml"/>
  <Override PartName="/3D/3dmodel.model" ContentType="application/vnd.ms-3mf.model+xml"/>
  <Override PartName="/3D/3dmodel.glb" ContentType="application/octet-stream"/>
  <Override PartName="/3D/3dmodel.stl" ContentType="model/stl"/>
</Types>`;
}

function createRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="3D/3dmodel.model"/>
</Relationships>`;
}

function createMinimalPlaceholderModel(): string {
  // Create a minimal placeholder mesh (a small tetrahedron)
  // This ensures the 3MF is valid even if we can't parse the original
  const vertices = [
    [0, 0, 0],
    [10, 0, 0],
    [5, 10, 0],
    [5, 5, 10],
  ];
  const triangles = [
    [0, 1, 2],
    [0, 1, 3],
    [1, 2, 3],
    [0, 2, 3],
  ];

  const vertsXml = vertices.map((v) => `      <vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('\n');
  const trisXml = triangles.map((t) => `      <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2021/06" unit="millimeter" xml:lang="en-US">
  <metadata name="Title">Exported Model</metadata>
  <metadata name="Designer">Creamax</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertsXml}
        </vertices>
        <triangles>
${trisXml}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`;
}

function createModelXmlFromMeshes(meshes: { name?: string; vertices: number[][]; triangles: number[][] }[], unit = 'millimeter') {
  // Merge all meshes into a single mesh with consolidated vertices and triangles
  // Use loops instead of spread operator to avoid stack overflow with large arrays
  const consolidatedVertices: number[][] = [];
  const consolidatedTriangles: number[][] = [];
  let vertexOffset = 0;

  for (const mesh of meshes) {
    // Add all vertices from this mesh (use loop to avoid spread operator with large arrays)
    for (const v of mesh.vertices) {
      consolidatedVertices.push(v);
    }

    // Add all triangles, adjusting vertex indices by the current offset
    for (const triangle of mesh.triangles) {
      consolidatedTriangles.push([
        triangle[0] + vertexOffset,
        triangle[1] + vertexOffset,
        triangle[2] + vertexOffset,
      ]);
    }

    vertexOffset += mesh.vertices.length;
  }

  // Build XML for consolidated mesh (build strings incrementally to avoid huge string joins)
  let vertsXml = '';
  for (let i = 0; i < consolidatedVertices.length; i++) {
    const v = consolidatedVertices[i];
    vertsXml += `      <vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>\n`;
  }

  let trisXml = '';
  for (let i = 0; i < consolidatedTriangles.length; i++) {
    const t = consolidatedTriangles[i];
    trisXml += `      <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2021/06" unit="${unit}" xml:lang="en-US">
  <metadata name="Title">Exported Model</metadata>
  <metadata name="Designer">Creamax</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertsXml}
        </vertices>
        <triangles>
${trisXml}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`;
}

function parseAsciiStl(buffer: Buffer) {
  // Parse ASCII STL and split by 'solid NAME ... endsolid NAME' blocks.
  const text = buffer.toString('utf8');
  const solidRe = /solid\s*([^\r\n]*)[\r\n]([\s\S]*?)endsolid/gi;
  const vertexRe = /vertex\s+([-+eE0-9.]+)\s+([-+eE0-9.]+)\s+([-+eE0-9.]+)/gi;

  const meshes: { name?: string; vertices: number[][]; triangles: number[][] }[] = [];

  let m: RegExpExecArray | null;
  let anyMatch = false;
  while ((m = solidRe.exec(text))) {
    anyMatch = true;
    const name = (m[1] || '').trim() || undefined;
    const block = m[2] || '';

    const vertsRaw: number[][] = [];
    let vm: RegExpExecArray | null;
    while ((vm = vertexRe.exec(block))) {
      vertsRaw.push([Number(vm[1]), Number(vm[2]), Number(vm[3])]);
    }

    // Deduplicate vertices and build triangles for this solid
    const uniqueMap = new Map<string, number>();
    const uniqueVerts: number[][] = [];
    const triangles: number[][] = [];
    for (let i = 0; i < vertsRaw.length; i += 3) {
      const triIdx: number[] = [];
      for (let j = 0; j < 3; j++) {
        const v = vertsRaw[i + j];
        if (!v) continue;
        const key = `${v[0].toFixed(6)}|${v[1].toFixed(6)}|${v[2].toFixed(6)}`;
        let idx = uniqueMap.get(key);
        if (idx === undefined) {
          idx = uniqueVerts.length;
          uniqueMap.set(key, idx);
          uniqueVerts.push([v[0], v[1], v[2]]);
        }
        triIdx.push(idx);
      }
      if (triIdx.length === 3) triangles.push(triIdx);
    }

    meshes.push({ name, vertices: uniqueVerts, triangles });
  }

  // If no solids found, fallback to scanning all vertices in the file as a single mesh
  if (!anyMatch) {
    const verts: number[][] = [];
    let vm2: RegExpExecArray | null;
    while ((vm2 = vertexRe.exec(text))) {
      verts.push([Number(vm2[1]), Number(vm2[2]), Number(vm2[3])]);
    }
    const uniqueMap = new Map<string, number>();
    const uniqueVerts: number[][] = [];
    const triangles: number[][] = [];
    for (let i = 0; i < verts.length; i += 3) {
      const triIdx: number[] = [];
      for (let j = 0; j < 3; j++) {
        const v = verts[i + j];
        if (!v) continue;
        const key = `${v[0].toFixed(6)}|${v[1].toFixed(6)}|${v[2].toFixed(6)}`;
        let idx = uniqueMap.get(key);
        if (idx === undefined) {
          idx = uniqueVerts.length;
          uniqueMap.set(key, idx);
          uniqueVerts.push([v[0], v[1], v[2]]);
        }
        triIdx.push(idx);
      }
      if (triIdx.length === 3) triangles.push(triIdx);
    }
    meshes.push({ vertices: uniqueVerts, triangles });
  }

  return meshes;
}

function parseBinaryStl(buffer: Buffer) {
  // Parse Binary STL format
  // Header: 80 bytes (skip)
  // Uint32: Number of triangles (4 bytes)
  // For each triangle:
  //   Float32[3]: Normal vector (12 bytes)
  //   Float32[3]: Vertex 1 (12 bytes)
  //   Float32[3]: Vertex 2 (12 bytes)
  //   Float32[3]: Vertex 3 (12 bytes)
  //   Uint16: Attribute byte count (2 bytes)
  // Total: 80 + 4 + (50 bytes per triangle)

  if (buffer.length < 84) {
    return []; // Not enough data for a binary STL
  }

  const numTriangles = buffer.readUInt32LE(80);
  const expectedSize = 80 + 4 + numTriangles * 50;

  if (buffer.length < expectedSize) {
    // eslint-disable-next-line no-console
    console.warn('[parseBinaryStl] Buffer too small for declared triangle count');
  }

  const vertices: number[][] = [];
  const triangleIndices: number[][] = [];
  const vertexMap = new Map<string, number>();

  for (let i = 0; i < numTriangles; i++) {
    const offset = 80 + 4 + i * 50;

    // Skip normal vector (12 bytes)
    // Read 3 vertices
    const verticesTri: number[] = [];
    for (let j = 0; j < 3; j++) {
      const vOffset = offset + 12 + j * 12;
      const x = buffer.readFloatLE(vOffset);
      const y = buffer.readFloatLE(vOffset + 4);
      const z = buffer.readFloatLE(vOffset + 8);

      const key = `${x.toFixed(6)}|${y.toFixed(6)}|${z.toFixed(6)}`;
      let vIdx = vertexMap.get(key);
      if (vIdx === undefined) {
        vIdx = vertices.length;
        vertexMap.set(key, vIdx);
        vertices.push([x, y, z]);
      }
      verticesTri.push(vIdx);
    }

    if (verticesTri.length === 3) {
      triangleIndices.push(verticesTri);
    }
  }

  return [{ vertices, triangles: triangleIndices }];
}

function extractMeshesFromThreeGeometry(geometry: any): { name?: string; vertices: number[][]; triangles: number[][] }[] {
  // Extract vertices and triangles from a THREE.BufferGeometry
  const vertices: number[][] = [];
  const triangles: number[][] = [];

  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return [];
  }

  const positions = geometry.attributes.position.array;
  const indices = geometry.index?.array || null;

  // Extract vertices
  for (let i = 0; i < positions.length; i += 3) {
    vertices.push([positions[i], positions[i + 1], positions[i + 2]]);
  }

  // Extract triangles
  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      triangles.push([indices[i], indices[i + 1], indices[i + 2]]);
    }
  } else {
    // If no indices, assume each 3 vertices form a triangle
    for (let i = 0; i < vertices.length; i += 3) {
      triangles.push([i, i + 1, i + 2]);
    }
  }

  return [{ vertices, triangles }];
}

function loadStlIntoThreeGeometry(buffer: Buffer) {
  // Load STL file into THREE.Geometry using a custom parser
  // This mimics what STLLoader does
  const THREE = getThree();

  const geometry = new THREE.BufferGeometry();

  // Better detection: Binary STL has exactly 84 bytes header + (50 bytes per triangle)
  // ASCII STL starts with 'solid' and is human-readable
  const possiblyAscii = buffer.slice(0, 5).toString('utf8').toLowerCase() === 'solid';
  
  let isASCII = false;
  if (possiblyAscii) {
    // Additional check: try to find 'endsolid' to confirm it's ASCII
    try {
      const text = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
      isASCII = text.includes('endsolid') || text.includes('facet');
    } catch (e) {
      isASCII = false;
    }
  }

  if (isASCII) {
    // ASCII STL - parse as text (only for smaller files to avoid memory issues)
    // eslint-disable-next-line no-console
    console.log('[loadStlIntoThreeGeometry] Parsing as ASCII STL');
    try {
      const text = buffer.toString('utf8');
      const vertexRe = /vertex\s+([-+eE0-9.]+)\s+([-+eE0-9.]+)\s+([-+eE0-9.]+)/gi;

      const vertices: number[] = [];
      let match;
      while ((match = vertexRe.exec(text))) {
        vertices.push(Number(match[1]), Number(match[2]), Number(match[3]));
      }

      if (vertices.length === 0) {
        throw new Error('No vertices found in ASCII STL');
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[loadStlIntoThreeGeometry] ASCII parse failed, trying binary:', e);
      isASCII = false; // Fall through to binary parsing
    }
  }

  if (!isASCII) {
    // Binary STL parsing
    // eslint-disable-next-line no-console
    console.log('[loadStlIntoThreeGeometry] Parsing as Binary STL');
    if (buffer.length < 84) {
      throw new Error('Binary STL buffer too small (< 84 bytes)');
    }

    const numTriangles = buffer.readUInt32LE(80);
    const expectedSize = 80 + 4 + numTriangles * 50;

    if (buffer.length < expectedSize) {
      // eslint-disable-next-line no-console
      console.warn('[loadStlIntoThreeGeometry] Buffer smaller than expected. Expected:', expectedSize, 'Got:', buffer.length);
      // Don't fail, try to parse what we have
    }

    const vertices: number[] = [];
    const maxTrianglesToParse = Math.min(numTriangles, Math.floor((buffer.length - 84) / 50));

    for (let i = 0; i < maxTrianglesToParse; i++) {
      const offset = 80 + 4 + i * 50;

      // Ensure we don't read past buffer bounds
      if (offset + 50 > buffer.length) {
        // eslint-disable-next-line no-console
        console.warn('[loadStlIntoThreeGeometry] Reached end of buffer at triangle', i);
        break;
      }

      // Skip normal (12 bytes), read 3 vertices (12 bytes each)
      for (let j = 0; j < 3; j++) {
        const vOffset = offset + 12 + j * 12;
        if (vOffset + 12 > buffer.length) {
          break;
        }
        vertices.push(
          buffer.readFloatLE(vOffset),
          buffer.readFloatLE(vOffset + 4),
          buffer.readFloatLE(vOffset + 8)
        );
      }
    }

    if (vertices.length === 0) {
      throw new Error('No vertices parsed from binary STL');
    }

    // eslint-disable-next-line no-console
    console.log('[loadStlIntoThreeGeometry] Parsed', Math.floor(vertices.length / 3), 'vertices');
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  }

  // Compute normals and bounds
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  return geometry;
}

function centerMeshesInPrintVolume(meshes: { name?: string; vertices: number[][]; triangles: number[][] }[]) {
  // Find global bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const mesh of meshes) {
    for (const v of mesh.vertices) {
      minX = Math.min(minX, v[0]);
      minY = Math.min(minY, v[1]);
      minZ = Math.min(minZ, v[2]);
      maxX = Math.max(maxX, v[0]);
      maxY = Math.max(maxY, v[1]);
      maxZ = Math.max(maxZ, v[2]);
    }
  }

  if (!isFinite(minX)) return meshes; // No vertices

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Offset: place center at (110, 110) and minimum Z at 0
  const offsetX = 110 - centerX;
  const offsetY = 110 - centerY;
  const offsetZ = -minZ;

  // eslint-disable-next-line no-console
  console.log('[centerMeshesInPrintVolume] Translating by offset:', [offsetX, offsetY, offsetZ]);

  // Apply offset to all vertices
  for (const mesh of meshes) {
    for (const v of mesh.vertices) {
      v[0] += offsetX;
      v[1] += offsetY;
      v[2] += offsetZ;
    }
  }

  return meshes;
}

export async function POST(req: Request) {
  try {
  const body = await req.arrayBuffer();
  const inputBuffer = Buffer.from(body);

  // eslint-disable-next-line no-console
  console.log('[gltf-to-3mf] Received input (', inputBuffer.length, 'bytes). Attempting to detect type');

  // detect if input is ASCII STL (starts with 'solid') or binary otherwise
  const header = inputBuffer.slice(0, 6).toString('utf8');
  const isAsciiStl = header.startsWith('solid');
  // eslint-disable-next-line no-console
  console.log('[gltf-to-3mf] Detected ASCII STL:', isAsciiStl);

    const chunks: any[] = [];
    const archive = archiver('zip', { zlib: { level: 0 } });

    archive.on('data', (chunk: any) => {
      chunks.push(chunk);
    });

    return new Promise<NextResponse>((resolve, reject) => {
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        // eslint-disable-next-line no-console
        console.log('[gltf-to-3mf] Created 3MF ZIP:', zipBuffer.length, 'bytes');
        resolve(
          new NextResponse(zipBuffer as any, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.ms-3mf',
              'Content-Length': String(zipBuffer.length),
            },
          })
        );
      });

      archive.on('error', (err: any) => {
        // eslint-disable-next-line no-console
        console.error('[gltf-to-3mf] Archive error:', err);
        reject(err);
      });

      
          // Try to load STL into THREE.js and extract properly
          try {
            // eslint-disable-next-line no-console
            console.log('[gltf-to-3mf] Attempting to load STL into THREE.js');
            const geometry = loadStlIntoThreeGeometry(inputBuffer);
            let meshes = extractMeshesFromThreeGeometry(geometry);

            if (meshes.length === 0 || meshes[0].vertices.length === 0) {
              throw new Error('No vertices extracted from STL');
            }

            // Center meshes in print volume
            meshes = centerMeshesInPrintVolume(meshes);

            // Detect unit
            let maxAbs = 0;
            for (const mesh of meshes) {
              for (const v of mesh.vertices) {
                maxAbs = Math.max(maxAbs, Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
              }
            }
            const unit = maxAbs > 0 && maxAbs < 10 ? 'meter' : 'millimeter';

            // eslint-disable-next-line no-console
            console.log('[gltf-to-3mf] Successfully extracted', meshes[0].vertices.length, 'vertices from STL');
            const modelXml = createModelXmlFromMeshes(meshes, unit);
            archive.append(createContentTypesXml(), { name: '[Content_Types].xml' });
            archive.append(createRelsXml(), { name: '_rels/.rels' });
            archive.append(modelXml, { name: '3D/3dmodel.model' });
          } catch (stlErr) {
            // Fallback: Use placeholder if parsing fails
            // eslint-disable-next-line no-console
            console.error('[gltf-to-3mf] Failed to load STL:', stlErr);
            archive.append(createContentTypesXml(), { name: '[Content_Types].xml' });
            archive.append(createRelsXml(), { name: '_rels/.rels' });
            archive.append(createMinimalPlaceholderModel(), { name: '3D/3dmodel.model' });
          }
      archive.finalize();
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[gltf-to-3mf] Error:', err);
      return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[gltf-to-3mf] Error:', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
