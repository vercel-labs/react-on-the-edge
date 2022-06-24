import App from "../src/app";
import { renderToString } from "react-dom/server";

export default async function Handler(req: Request) {
  let html: string;

  try {
    html = renderToString(<App req={req} />);
  } catch (err) {
    console.error("Render error:", err.stack);
    return new Response(
      `<!doctype html><h1>Internal application error</h1>
      <p>The app failed to render. Check your Edge Function logs.</p>`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }

  return new Response(`<!doctype html>` + html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
