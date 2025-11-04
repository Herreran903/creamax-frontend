import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ taskId: 'task_demo' });
}
