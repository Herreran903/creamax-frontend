import { NextResponse } from 'next/server';

type Mode = 'CATALOGO' | 'IA' | 'SUBIR_3D' | 'ARTESANAL';

export async function POST(req: Request) {
  const body = await req.json();

  const productType: 'LLAVERO' | 'IMAN_NEVERA' | 'FIGURA' = body.productType ?? 'LLAVERO';
  const includeNFC: boolean = Boolean(body.includeNFC);
  const quantity: number = Math.max(1, Number.parseInt(String(body.quantity ?? '1'), 10) || 1);
  const mode: Mode = (body.mode as Mode) ?? 'CATALOGO';
  const artisanChanges: boolean = Boolean(body.artisanChanges);

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
  const amount = unitPrice * quantity + aiArtisanSurcharge;

  return NextResponse.json({
    id: 'q2',
    currency: 'USD',
    amount,
    estimateDays: baseDays + qtyDays + artisanDays,
    includesNFC: includeNFC,
    modelOnly: false,
    approx: mode === 'IA' || mode === 'SUBIR_3D' ? true : false,
    mode,
  });
}
