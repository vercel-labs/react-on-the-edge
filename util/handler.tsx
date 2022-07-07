import App from '../src/app';
import { renderToString } from 'react-dom/server';

let isCold = true;

export default async function Handler(req: Request) {
  const wasCold = isCold;
  let html: string;
  isCold = false;

  try {
    html = renderToString(<App req={req} isCold={wasCold} />);
  } catch (err) {
    console.error('Render error:', err.stack);
    return new Response(
      `<!doctype html><h1>Internal application error</h1>
      <p>The app failed to render. Check your Edge Function logs.</p>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }

  return new Response(`<!doctype html>` + html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'x-is-cold': wasCold ? 'true' : 'false',
    },
  });
}
