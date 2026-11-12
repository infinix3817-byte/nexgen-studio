import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

const MODELS: Record<string, string> = {
  kling: 'fal-ai/kling-video/v1/standard/text-to-video',
  hailuo: 'fal-ai/minimax/video-01',
};

function configureFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not configured. Add it to your environment to enable generation.');
  fal.config({ credentials: key });
}

export async function POST(request: Request) {
  try {
    configureFal();
    const body = await request.json();
    const { prompt, model = 'kling', duration = 5, aspectRatio = '16:9', imageUrl } = body;
    if (typeof prompt !== 'string' || prompt.trim().length < 2) return NextResponse.json({ error: 'Please enter a prompt with at least 2 characters.' }, { status: 400 });
    const endpoint = MODELS[model];
    if (!endpoint) return NextResponse.json({ error: 'Unsupported video model.' }, { status: 400 });
    if (imageUrl && (typeof imageUrl !== 'string' || !/^https:\/\//.test(imageUrl))) return NextResponse.json({ error: 'Image URL must be a secure https URL.' }, { status: 400 });
    const input: Record<string, unknown> = { prompt: prompt.trim(), duration: String(duration), aspect_ratio: aspectRatio };
    if (imageUrl) input.image_url = imageUrl;
    const { request_id } = await fal.queue.submit(endpoint, { input });
    return NextResponse.json({ requestId: request_id, model, status: 'IN_QUEUE' }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start video generation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    configureFal();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const model = searchParams.get('model') ?? 'kling';
    const endpoint = MODELS[model];
    if (!requestId || !endpoint) return NextResponse.json({ error: 'A valid requestId and model are required.' }, { status: 400 });
    const status = await fal.queue.status(endpoint, { requestId, logs: true });
    if (status.status !== 'COMPLETED') return NextResponse.json({ status: status.status, logs: status.logs ?? [] });
    const result = await fal.queue.result(endpoint, { requestId });
    return NextResponse.json({ status: 'COMPLETED', result: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check video generation status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
