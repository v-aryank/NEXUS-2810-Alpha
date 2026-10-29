import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
const timeoutMs = Number(process.env.ESP32_TIMEOUT_MS ?? 5000);
const maxBodyBytes = 64 * 1024;
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function parseOrigin(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute http(s) origin.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
    throw new Error(`${name} must contain only an http(s) origin, without credentials or a path.`);
  }
  return url.origin;
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535.');
}
if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 120000) {
  throw new Error('ESP32_TIMEOUT_MS must be an integer from 250 to 120000.');
}

const targetValue = process.env.ESP32_TARGET;
if (!targetValue) throw new Error('ESP32_TARGET is required, for example http://192.168.1.50.');
const targetOrigin = parseOrigin(targetValue, 'ESP32_TARGET');
const corsOrigins = new Set(allowedOrigins.map((origin) => parseOrigin(origin, 'ALLOWED_ORIGIN')));

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function corsForRequest(request, response) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = forwardedProto === 'https' ? 'https:' : 'http:';
  const sameOrigin = `${protocol}//${request.headers.host}` === origin;
  if (!sameOrigin && !corsOrigins.has(origin)) return false;

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
  return true;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxyApi(request, response, pathname) {
  if (!['GET', 'PUT', 'POST'].includes(request.method)) {
    return sendJson(response, 405, { success: false, error: 'Method not allowed.' });
  }
  if (pathname !== '/api/v1' && !pathname.startsWith('/api/v1/')) {
    return sendJson(response, 404, { success: false, error: 'API route not found.' });
  }

  let body;
  try {
    body = request.method === 'GET' ? undefined : await readBody(request);
  } catch (error) {
    return sendJson(response, error.status ?? 400, { success: false, error: error.message });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch(new URL(request.url, targetOrigin), {
      method: request.method,
      headers: {
        Accept: request.headers.accept ?? 'application/json',
        ...(request.headers['content-type'] ? { 'Content-Type': request.headers['content-type'] } : {})
      },
      body,
      signal: controller.signal
    });
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Content-Length': responseBody.length,
      'Cache-Control': 'no-store'
    });
    response.end(responseBody);
  } catch (error) {
    if (response.headersSent) return response.destroy();
    const timedOut = controller.signal.aborted;
    sendJson(response, timedOut ? 504 : 502, {
      success: false,
      error: timedOut
        ? `ESP32 request timed out after ${timeoutMs} ms.`
        : 'ESP32 is unreachable from the API host.'
    });
  } finally {
    clearTimeout(timer);
  }
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function serveStatic(request, response, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return sendJson(response, 405, { success: false, error: 'Method not allowed.' });
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return sendJson(response, 400, { success: false, error: 'Invalid URL path.' });
  }

  let filePath = resolve(root, `.${decodedPath}`);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return sendJson(response, 400, { success: false, error: 'Invalid URL path.' });
  }

  try {
    const details = await stat(filePath);
    if (details.isDirectory()) filePath = resolve(filePath, 'index.html');
    const fileDetails = await stat(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
      'Content-Length': fileDetails.size,
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(filePath).pipe(response);
  } catch {
    if (request.headers.accept?.includes('text/html')) {
      return serveStatic(request, response, '/index.html');
    }
    return sendJson(response, 404, { success: false, error: 'File not found.' });
  }
}

const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  } catch {
    return sendJson(response, 400, { success: false, error: 'Invalid request URL.' });
  }

  if (url.pathname === '/') {
    return serveStatic(request, response, '/index.html');
  }

  if (url.pathname.startsWith('/api/')) {
    if (!corsForRequest(request, response)) {
      return sendJson(response, 403, { success: false, error: 'Origin is not allowed.' });
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      return response.end();
    }
    return proxyApi(request, response, url.pathname);
  }

  if (url.pathname === '/healthz') return sendJson(response, 200, { status: 'ok' });
  return serveStatic(request, response, url.pathname);
});

server.listen(port, host, () => {
  console.log(`NEXUS app/API listening on ${host}:${port}; ESP32 target ${targetOrigin}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
