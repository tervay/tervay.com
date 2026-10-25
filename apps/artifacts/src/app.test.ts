import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import { createStore } from "./store";

const dir = await mkdtemp(join(tmpdir(), "artifacts-"));
const app = createApp({ store: createStore(dir), token: "secret" });
afterAll(() => rm(dir, { recursive: true }));

const send = (method: string, path: string, body?: unknown, token = "secret") =>
  app.request(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const publish = async (title = "Hello", html = "<h1>hi</h1>") =>
  (await (await send("POST", "/api/artifacts", { title, html })).json()) as { id: string; url: string };

describe("auth", () => {
  test("writes need the right token", async () => {
    expect((await app.request("/api/artifacts", { method: "POST" })).status).toBe(401);
    expect((await send("POST", "/api/artifacts", { title: "x", html: "" }, "wrong")).status).toBe(401);
    expect((await send("PUT", "/api/artifacts/aaaaaaaaaaaa", { title: "x" }, "wrong")).status).toBe(401);
    expect((await send("DELETE", "/api/artifacts/aaaaaaaaaaaa", undefined, "wrong")).status).toBe(401);
  });

  test("reads are public", async () => {
    expect((await app.request("/api/artifacts")).status).toBe(200);
    expect((await app.request("/")).status).toBe(200);
  });
});

describe("artifacts", () => {
  test("rejects bad bodies", async () => {
    expect((await send("POST", "/api/artifacts", { title: "", html: "x" })).status).toBe(400);
    expect((await send("POST", "/api/artifacts", { title: "x" })).status).toBe(400);
  });

  test("publish then serve sandboxed", async () => {
    const { id, url } = await publish();
    expect(url).toBe(`http://localhost/a/${id}`);
    const res = await app.request(`/raw/${id}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toStartWith("text/html");
    expect(res.headers.get("content-security-policy")).toStartWith("sandbox allow-scripts");
    expect(await res.text()).toBe("<h1>hi</h1>");
  });

  test("url honors forwarded proto", async () => {
    const res = await app.request("/api/artifacts", {
      method: "POST",
      headers: { Authorization: "Bearer secret", "X-Forwarded-Proto": "https" },
      body: JSON.stringify({ title: "t", html: "" }),
    });
    expect(((await res.json()) as { url: string }).url).toStartWith("https://");
  });

  test("raw without slash redirects", async () => {
    const { id } = await publish();
    expect((await app.request(`/raw/${id}`)).headers.get("location")).toBe(`/raw/${id}/`);
  });

  test("update keeps id", async () => {
    const { id } = await publish();
    const res = await send("PUT", `/api/artifacts/${id}`, { title: "Renamed", html: "<p>new</p>" });
    expect(((await res.json()) as { id: string }).id).toBe(id);
    expect(await (await app.request(`/raw/${id}/`)).text()).toBe("<p>new</p>");
    expect(await (await app.request(`/a/${id}`)).text()).toContain("Renamed");
  });

  test("delete removes it", async () => {
    const { id } = await publish();
    expect((await send("DELETE", `/api/artifacts/${id}`)).status).toBe(204);
    expect((await app.request(`/a/${id}`)).status).toBe(404);
    expect((await send("DELETE", `/api/artifacts/${id}`)).status).toBe(404);
  });

  test("pages show titles", async () => {
    const { id } = await publish("Visible <Title>");
    expect(await (await app.request("/")).text()).toContain("Visible &lt;Title&gt;");
    expect(await (await app.request(`/a/${id}`)).text()).toContain(`src="/raw/${id}/"`);
  });

  test("blocks traversal and unknown ids", async () => {
    const { id } = await publish();
    expect((await app.request(`/raw/${id}/..%2fmeta.json`)).status).toBe(404);
    expect((await app.request(`/raw/${id}/%2e%2e/meta.json`)).headers.get("location")).toBe("/raw/meta.json/");
    expect((await app.request("/raw/meta.json/")).status).toBe(404);
    expect((await app.request("/raw/..%2f..%2fetc/passwd")).status).toBe(404);
    expect((await app.request("/raw/aaaaaaaaaaaa/")).status).toBe(404);
    expect((await app.request("/a/nope")).status).toBe(404);
  });
});
