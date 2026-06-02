import { assertNonDelete, readToken, requestTimeoutMs, requestUrl } from './dooray-common.mjs';

export async function doorayRequest(config, method, pathOrUrl, body) {
  assertNonDelete(method, pathOrUrl);
  const token = await readToken(config);
  const headers = { Authorization: `dooray-api ${token}`, Accept: 'application/json' };
  if (body != null) headers['Content-Type'] = 'application/json';
  const timeoutMs = requestTimeoutMs(config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(requestUrl(config, pathOrUrl), { method: method.toUpperCase(), headers, body, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Dooray API ${method} ${pathOrUrl} timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let parsed = text;
  try { parsed = JSON.parse(text); } catch {}
  if (!res.ok) {
    const error = new Error(`Dooray API ${method} ${pathOrUrl} failed: ${res.status} ${res.statusText}`);
    error.status = res.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}
