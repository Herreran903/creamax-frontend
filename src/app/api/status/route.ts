import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ id: 'task_demo', status: 'SUCCEEDED', modelUrl: '/mock/model.glb' });
}
