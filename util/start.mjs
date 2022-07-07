// this command starts a local server
import { readFile } from 'fs/promises';
import { EdgeRuntime } from 'edge-runtime';
import { join } from 'path';
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import createSirv from 'sirv';

process.on('uncaughtException', (err) => {
  throw err;
});

// constants
const WORK_DIR = process.cwd();
const OUT_DIR = join(WORK_DIR, '.out');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const START_FILE = join(__dirname, 'start-shim.js');
const START_FILE_OUT = join(OUT_DIR, 'start.js');

// shim to append the `addEventListener` code
await build({
  bundle: true,
  target: ['es2022'],
  entryPoints: [START_FILE],
  outfile: START_FILE_OUT,
  format: 'esm',
});

// read the generated code
let code = await readFile(START_FILE_OUT);

const runtime = new EdgeRuntime({ initialCode: code });
const sirv = createSirv(join(WORK_DIR, 'static'), { etag: true });

createServer(async (req, res) => {
  const urlString = `http://${req.headers.host}${req.url}`;
  const url = new URL(urlString);

  // set default cache busting headers
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  if (/^\/static(\/|$)/.test(url.pathname)) {
    // strip the `/static` prefix
    req.url = req.url.replace(/^\/static/, '');
    sirv(req, res);
  } else {
    try {
      const subReq = await runtime.dispatchFetch(urlString);
      res.writeHead(subReq.status, subReq.headers);
      for await (const chunk of subReq.body) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      res.writeHead(500);
      res.end(err.stack);
    }
  }
}).listen(3000, (err) => {
  if (err) throw err;
  console.log('Listening on http://localhost:3000 / http://0.0.0.0:3000');
});
