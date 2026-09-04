import { openrouter } from '@/lib/api/openrouter';
import { parseUsage } from '@/lib/utils/usage';
import type { ChatRequestOptions, GenerationUsage, Message, ResponseUsage } from '@/types/openrouter';
import { createTextStreamResponse, streamText } from 'ai';

export async function POST(req: Request) {
  const { messages, options }: {
    messages: Message[];
    options: ChatRequestOptions;
  } = await req.json();

  const result = streamText({
    model: openrouter(options.model, {
      extraBody: {
        max_tokens: options.max_tokens,
        ...(options.reasoning && { reasoning: options.reasoning }),
      },
    }),
    messages,
    temperature: options.temperature,
  });

  let usage: GenerationUsage | null = null;

  const finalStep = await result.finalStep;
  const raw = finalStep.providerMetadata?.openrouter as ResponseUsage | undefined;
  if (raw) usage = parseUsage(raw);

  const response = createTextStreamResponse({ stream: result.textStream });
  if (usage) response.headers.set('X-Usage', JSON.stringify(usage));

  return response;
}
