import { concatBytes } from './bytes.js';

export const MAX_DECOMPRESSED_BYTES = 32 * 1024 * 1024;

/** `Response` rather than `Blob.stream()`, which jsdom (used by the web tests) doesn't implement. */
function streamOf(bytes: Uint8Array<ArrayBuffer>): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new Response(bytes).body as ReadableStream<Uint8Array<ArrayBuffer>>;
}

export async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const compressed = streamOf(bytes).pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

export async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = streamOf(bytes).pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    total += chunk.value.length;
    if (total > MAX_DECOMPRESSED_BYTES) {
      await reader.cancel();
      throw new Error('Decompressed data is too large');
    }
    chunks.push(chunk.value);
  }
  return concatBytes(...chunks);
}
