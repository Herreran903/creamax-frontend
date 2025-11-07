import { NextResponse } from 'next/server';

type Mode = 'CATALOGO' | 'IA' | 'SUBIR_3D' | 'ARTESANAL';

export async function POST(req: Request) {
  const body = await req.json();

  const productType: 'LLAVERO' | 'IMAN_NEVERA' | 'FIGURA' = body.productType ?? 'LLAVERO';
  const includeNFC: boolean = body?.nfc?.include ?? Boolean(body.includeNFC);
  const quantity: number = Math.max(1, Number.parseInt(String(body.quantity ?? '1'), 10) || 1);
  const mode: Mode = (body.mode as Mode) ?? 'CATALOGO';
  const artisanChanges: boolean = Boolean(body.artisanChanges);
  const model = body?.model ?? null;

  const baseUnit = productType === 'FIGURA' ? 35 : productType === 'IMAN_NEVERA' ? 15 : 10;

  // NFC cost is per-unit
  const nfcUnit = includeNFC ? 5 : 0;

  // Surcharge if AI result requires artisan changes
  const aiArtisanSurcharge = artisanChanges && mode === 'IA' ? 15 : 0;

  // Estimation of days (very rough mock)
  const baseDays = 5;
  const qtyDays = Math.ceil(quantity / 100); // +1 day per 100 units
  const artisanDays = artisanChanges && mode === 'IA' ? 2 : 0;

  // ARTESANAL: only model design fee, no product quote yet
  if (mode === 'ARTESANAL') {
    // Simple fee per product type for 3D modeling work
    const modelFee = productType === 'FIGURA' ? 60 : productType === 'IMAN_NEVERA' ? 40 : 45;

    return NextResponse.json({
      id: 'q-art-1',
      currency: 'USD',
      amount: modelFee,
      estimateDays: 7, // model design ETA (business days)
      includesNFC: false,
      modelOnly: true,
      note: 'Costo solo por modelado 3D. La cotización del producto final se entregará tras terminar el modelo.',
    });
  }

  // Regular quote (Catalog/IA/Upload3D)
  const unitPrice = baseUnit + nfcUnit;

  // Complexity multipliers based on model characteristics (triangles/materials/size)
  let complexityMultiplier = 1.0;
  let complexityDays = 0;
  try {
    if (model && typeof model === 'object') {
      const triangles = Number(model.triangles || 0);
      const materials = Number(model.materials || 0);
      const sizeMB = Number(model.sizeMB || 0);

      if (triangles > 300_000) {
        complexityMultiplier += 0.5; // +50%
        complexityDays += 3;
      } else if (triangles > 150_000) {
        complexityMultiplier += 0.25; // +25%
        complexityDays += 2;
      } else if (triangles > 80_000) {
        complexityMultiplier += 0.15; // +15%
        complexityDays += 1;
      }

      if (materials > 5) complexityMultiplier += 0.1; // +10%
      if (sizeMB > 20) complexityMultiplier += 0.1; // +10%
    }
  } catch {
    // ignore malformed model meta
  }

  const amount = Math.round((unitPrice * quantity + aiArtisanSurcharge) * complexityMultiplier);

  return NextResponse.json({
    id: 'q2',
    currency: 'USD',
    amount,
    estimateDays: baseDays + qtyDays + artisanDays + complexityDays,
    includesNFC: includeNFC,
    modelOnly: false,
    approx: mode === 'IA' || mode === 'SUBIR_3D' ? true : false,
    mode,
  });
}
