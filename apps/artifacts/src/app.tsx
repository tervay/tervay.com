import { Hono, type Context } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { bodyLimit } from "hono/body-limit";
import type { Store } from "./store";
import { Gallery, Viewer } from "./views";

export const SANDBOX = "allow-scripts allow-forms allow-popups allow-modals allow-downloads";

const isTitle = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

const link = (c: Context, id: string) => {
  const url = new URL(`/a/${id}`, c.req.url);
  url.protocol = c.req.header("x-forwarded-proto") ?? url.protocol;
  return url.href;
};

export const createApp = ({ store, token }: { store: Store; token: string }) => {
  const app = new Hono();

  app.on(["POST", "PUT", "DELETE"], "/api/*", bearerAuth({ token }), bodyLimit({ maxSize: 10 * 1024 * 1024 }));

  app.get("/", async (c) => c.html(<Gallery artifacts={await store.list()} />));

  app.get("/a/:id", async (c) => {
    const meta = await store.get(c.req.param("id"));
    return meta ? c.html(<Viewer artifact={meta} sandbox={SANDBOX} />) : c.notFound();
  });

  app.get("/raw/:id", (c) => c.redirect(`/raw/${c.req.param("id")}/`, 301));

  app.get("/raw/:id/*", async (c) => {
    const id = c.req.param("id");
    const file = await store.resolveFile(id, c.req.path.slice(`/raw/${id}/`.length));
    if (!file) return c.notFound();
    return new Response(file, {
      headers: {
        "Content-Type": file.type,
        "Content-Security-Policy": `sandbox ${SANDBOX}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  app.get("/api/artifacts", async (c) => c.json(await store.list()));

  app.post("/api/artifacts", async (c) => {
    const { title, html } = await c.req.json().catch(() => ({}));
    if (!isTitle(title) || typeof html !== "string") return c.json({ error: "title and html must be strings" }, 400);
    const meta = await store.create(title, html);
    return c.json({ ...meta, url: link(c, meta.id) }, 201);
  });

  app.put("/api/artifacts/:id", async (c) => {
    const { title, html } = await c.req.json().catch(() => ({}));
    if ((title !== undefined && !isTitle(title)) || (html !== undefined && typeof html !== "string"))
      return c.json({ error: "title and html must be strings" }, 400);
    const meta = await store.update(c.req.param("id"), { title, html });
    return meta ? c.json({ ...meta, url: link(c, meta.id) }) : c.notFound();
  });

  app.delete("/api/artifacts/:id", async (c) =>
    (await store.remove(c.req.param("id"))) ? c.body(null, 204) : c.notFound(),
  );

  return app;
};
