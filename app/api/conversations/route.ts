import { conversationStore } from '@/lib/chat/store';
import { errorResponse } from '@/lib/chat/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await conversationStore.list(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
