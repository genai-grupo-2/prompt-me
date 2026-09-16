import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { errorResponse } from '@/lib/chat/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The cache demo needs a large block that is byte-identical across requests.
// The repository's own documents are the most honest source: they are real
// context for the assistant and they do not change between two consecutive runs.
// Each path is spelled out so the bundler traces only these three files.
const root = process.cwd();
const document = (name: string, content: string) => `<document name="${name}">\n${content}\n</document>`;

export async function GET() {
  try {
    const [mission, spec, research] = await Promise.all([
      readFile(path.join(root, 'mission.md'), 'utf8'),
      readFile(path.join(root, 'SPEC.md'), 'utf8'),
      readFile(path.join(root, 'docs/investigacion-openrouter.md'), 'utf8'),
    ]);
    const text = [
      '<reference>',
      'Documentación de referencia del proyecto. Es contexto estático: no cambia entre mensajes.',
      document('mission.md', mission),
      document('SPEC.md', spec),
      document('docs/investigacion-openrouter.md', research),
      '</reference>',
    ].join('\n\n');
    return Response.json({ text, characters: text.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
