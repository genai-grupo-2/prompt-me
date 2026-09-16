import { MODELS } from '@/lib/chat/models';

export function GET() {
  return Response.json(MODELS);
}
