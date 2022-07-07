import { build } from 'esbuild';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { stat, rm, mkdir, link, readdir, writeFile } from 'fs/promises';
import bytes from 'bytes';
import pc from 'picocolors';
import ms from 'ms';

// start date for building
const buildStart = Date.now();

// constants
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WORK_DIR = process.cwd();
const OUT_DIR = join(WORK_DIR, '.out');
const OUT_FILE = join(OUT_DIR, 'out.js');
const VERCEL_OUT_DIR = join(WORK_DIR, '.vercel', 'output');

// remove dist dir
await rm(OUT_DIR, { recursive: true, force: true });

// build
await build({
  bundle: true,
  target: ['es2022'],
  inject: [join(__dirname, 'import-shim.js')],
  entryPoints: [
    join(
      __dirname,
      process.env.USE_STREAMS ? 'handler-stream.tsx' : 'handler.tsx'
    ),
  ],
  outfile: OUT_FILE,
  minify: true,
  format: 'esm',
  define: {
    // ensures React production build
    'process.env.NODE_ENV': "'production'",
  },
});

// output
const outLength = (await stat(OUT_FILE)).size;
console.log(
  `✓ Built app bundle${
    process.env.USE_STREAMS ? ' (with streams)' : ''
  } ${pc.cyan(`(${bytes(outLength)})`)} ${pc.gray(
    `[${ms(Date.now() - buildStart)}]`
  )}`
);

// turn it into a vercel-specific build
const vercelBuildStart = Date.now();
await rm(VERCEL_OUT_DIR, { recursive: true, force: true });
await mkdir(join(VERCEL_OUT_DIR, 'functions', 'index.func'), {
  recursive: true,
});
await mkdir(join(VERCEL_OUT_DIR, 'static', 'static'), { recursive: true });

// save config
await writeFile(
  join(VERCEL_OUT_DIR, 'config.json'),
  JSON.stringify({ version: 3 }, null, 2)
);

// create function
await link(
  OUT_FILE,
  join(VERCEL_OUT_DIR, 'functions', 'index.func', 'index.js')
);
await writeFile(
  join(VERCEL_OUT_DIR, 'functions', 'index.func', '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'edge',
      entrypoint: 'index.js',
    },
    null,
    2
  )
);

// recursively copy static files using hard links
async function copyStatic(src, dest) {
  const files = await readdir(src);
  for (const file of files) {
    const child = join(src, file);
    const s = await stat(child);
    if (s.isDirectory()) {
      await mkdir(join(dest, file));
      await copyStatic(child, join(dest, file));
    } else {
      await link(join(src, file), join(dest, file));
    }
  }
}

await copyStatic(
  join(WORK_DIR, 'static'),
  join(VERCEL_OUT_DIR, 'static', 'static')
);

console.log(
  `✓ Transformed into Vercel build output ${pc.gray(
    `[${ms(Date.now() - vercelBuildStart)}]`
  )}`
);
