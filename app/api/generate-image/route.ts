import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

const MODELS: Record<string, string> = {
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'flux-schnell': 'fal-ai/flux/schnell',
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
    const { prompt, negativePrompt = '', aspectRatio = '1:1', model = 'flux-pro', style = 'none' } = body;
    if (typeof prompt !== 'string' || prompt.trim().length < 2) return NextResponse.json({ error: 'Please enter a prompt with at least 2 characters.' }, { status: 400 });
    const endpoint = MODELS[model];
    if (!endpoint) return NextResponse.json({ error: 'Unsupported image model.' }, { status: 400 });
    const dimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 }, '16:9': { width: 1344, height: 768 },
      '9:16': { width: 768, height: 1344 }, '4:5': { width: 896, height: 1120 },
    };
    const imageSize = dimensions[aspectRatio] ?? dimensions['1:1'];
    const fullPrompt = style && style !== 'none' ? `${prompt.trim()}, ${style} style` : prompt.trim();
    const { request_id } = await fal.queue.submit(endpoint, {
      input: { prompt: fullPrompt, negative_prompt: negativePrompt, image_size: imageSize, num_inference_steps: model === 'flux-schnell' ? 4 : 28 },
    });
    return NextResponse.json({ requestId: request_id, model, status: 'IN_QUEUE' }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start image generation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    configureFal();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const model = searchParams.get('model') ?? 'flux-pro';
    const endpoint = MODELS[model];
    if (!requestId || !endpoint) return NextResponse.json({ error: 'A valid requestId and model are required.' }, { status: 400 });
    const status = await fal.queue.status(endpoint, { requestId, logs: true });
    if (status.status !== 'COMPLETED') return NextResponse.json({ status: status.status, logs: status.logs ?? [] });
    const result = await fal.queue.result(endpoint, { requestId });
    return NextResponse.json({ status: 'COMPLETED', result: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check image generation status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
