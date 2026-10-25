import type { Child } from "hono/jsx";
import type { Meta } from "./store";

const css = `
*, *::before, *::after { box-sizing: border-box; min-width: 0; }
:root {
  color-scheme: light dark;
  --bg: light-dark(oklch(0.985 0 none), oklch(0.16 0 none));
  --fg: light-dark(oklch(0.2 0 none), oklch(0.95 0 none));
  --muted: color-mix(in oklch, var(--fg) 55%, var(--bg));
  --line: color-mix(in oklch, var(--fg) 12%, var(--bg));
  --card: light-dark(oklch(1 0 none), oklch(0.2 0 none));
  --accent: oklch(0.6 0.15 250);
  font-family: system-ui, sans-serif;
  text-wrap: pretty;
  overflow-wrap: break-word;
  -webkit-font-smoothing: antialiased;
}
body { margin: 0; min-height: 100svh; background: var(--bg); color: var(--fg); }
a { color: inherit; text-decoration: none; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.page { inline-size: min(100% - 2rem, 60rem); margin-inline: auto; padding-block: clamp(1.5rem, 1rem + 2vw, 3rem); }
h1 { margin-block: 0 1.5rem; font-size: 1.5rem; text-wrap: balance; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 1rem; padding: 0; margin: 0; list-style: none; }
.card { display: block; padding: 1rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--card); }
.card:active { background: color-mix(in oklch, var(--card), var(--fg) 6%); }
@media (hover: hover) and (pointer: fine) { .card:hover { border-color: var(--accent); } }
.card strong { display: block; margin-block-end: 0.25rem; }
.muted { color: var(--muted); font-size: 0.875rem; }
.viewer { display: grid; grid-template-rows: auto 1fr; block-size: 100dvh; }
.bar { display: flex; align-items: center; gap: 1rem; padding: 0.625rem 1rem; border-block-end: 1px solid var(--line); }
.bar strong { flex: 1; overflow: clip; text-overflow: ellipsis; white-space: nowrap; }
.bar a:active { opacity: 0.6; }
iframe { inline-size: 100%; block-size: 100%; border: 0; background: white; }
`;

const Layout = ({ title, children }: { title: string; children: Child }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <title>{title}</title>
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </head>
    <body>{children}</body>
  </html>
);

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });

export const Gallery = ({ artifacts }: { artifacts: Meta[] }) => (
  <Layout title="Artifacts">
    <main class="page">
      <h1>Artifacts</h1>
      {artifacts.length === 0 ? (
        <p class="muted">Nothing published yet.</p>
      ) : (
        <ul class="grid">
          {artifacts.map((a) => (
            <li>
              <a class="card" href={`/a/${a.id}`}>
                <strong>{a.title}</strong>
                <span class="muted">{date(a.updatedAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  </Layout>
);

export const Viewer = ({ artifact, sandbox }: { artifact: Meta; sandbox: string }) => (
  <Layout title={artifact.title}>
    <div class="viewer">
      <header class="bar">
        <a href="/" class="muted">Artifacts</a>
        <strong>{artifact.title}</strong>
        <a href={`/raw/${artifact.id}/`} class="muted">Open raw ↗</a>
      </header>
      <iframe src={`/raw/${artifact.id}/`} sandbox={sandbox} title={artifact.title} />
    </div>
  </Layout>
);
