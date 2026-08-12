import { createApp } from "../src/app.js";

// Vercel entry point. The Express app is itself a (req, res) handler, so the
// serverless function just exports it. `src/index.ts` stays the local entry
// point that actually calls listen() — Vercel never runs that file.
export default createApp();
