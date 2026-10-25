import { createApp } from "./app";
import { createStore } from "./store";

const token = process.env.ARTIFACTS_TOKEN;
if (!token) throw new Error("ARTIFACTS_TOKEN is required");

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: createApp({ store: createStore(process.env.DATA_DIR ?? "data"), token }).fetch,
};
