/** Reads a JSON file shipped with the app, or `null` when this version doesn't publish it. */
export async function fetchPublishedJson(url: string): Promise<string | null> {
  // The service worker never caches these files, so the request skips it and goes straight to the network.
  const response = await fetch(url, {
    cache: 'no-cache',
    headers: { 'ngsw-bypass': 'true' },
  });
  // Pages answers unknown paths with the app shell, so anything but JSON means "none published".
  const json = response.ok ? await response.text() : '';
  return json.trimStart().startsWith('{') ? json : null;
}
