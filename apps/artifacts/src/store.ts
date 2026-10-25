import { readdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

export type Meta = { id: string; title: string; createdAt: string; updatedAt: string };

const ID = /^[A-Za-z0-9_-]{12}$/;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => ALPHABET[b & 63]).join("");

export const createStore = (root: string) => {
  const metaPath = (id: string) => join(root, id, "meta.json");
  const filesDir = (id: string) => resolve(root, id, "files");
  const save = (meta: Meta) => Bun.write(metaPath(meta.id), JSON.stringify(meta));
  const saveHtml = (id: string, html: string) => Bun.write(join(filesDir(id), "index.html"), html);

  const get = async (id: string): Promise<Meta | null> =>
    ID.test(id) ? Bun.file(metaPath(id)).json().catch(() => null) : null;

  const list = async () => {
    const metas = await Promise.all((await readdir(root).catch(() => [])).map(get));
    return metas.filter((m): m is Meta => m !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  };

  const create = async (title: string, html: string) => {
    const now = new Date().toISOString();
    const meta = { id: newId(), title, createdAt: now, updatedAt: now };
    await saveHtml(meta.id, html);
    await save(meta);
    return meta;
  };

  const update = async (id: string, changes: { title?: string; html?: string }) => {
    const existing = await get(id);
    if (!existing) return null;
    if (changes.html !== undefined) await saveHtml(id, changes.html);
    const meta = { ...existing, title: changes.title ?? existing.title, updatedAt: new Date().toISOString() };
    await save(meta);
    return meta;
  };

  const remove = async (id: string) => {
    if (!(await get(id))) return false;
    await rm(join(root, id), { recursive: true });
    return true;
  };

  const resolveFile = async (id: string, path: string) => {
    if (!ID.test(id)) return null;
    const base = filesDir(id);
    const target = resolve(base, !path || path.endsWith("/") ? `${path}index.html` : path);
    if (!target.startsWith(base + sep)) return null;
    const file = Bun.file(target);
    return (await file.exists()) ? file : null;
  };

  return { get, list, create, update, remove, resolveFile };
};

export type Store = ReturnType<typeof createStore>;
