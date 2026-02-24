import express from "express";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const MAX_PORT_ATTEMPTS = Number.parseInt(process.env.MAX_PORT_ATTEMPTS || "20", 10);

const app = express();

app.use(express.static(ROOT_DIR));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "polimeter-static" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function startServer() {
  let port = PORT;
  const attempts = Number.isFinite(MAX_PORT_ATTEMPTS) && MAX_PORT_ATTEMPTS > 0
    ? MAX_PORT_ATTEMPTS
    : 20;

  for (let index = 0; index < attempts; index += 1) {
    const isAvailable = await isPortAvailable(port);
    if (isAvailable) {
      app.listen(port, () => {
        console.log(`Polimeter static app listening on http://localhost:${port}`);
      });
      return;
    }

    console.warn(`port ${port} is busy, trying ${port + 1}...`);
    port += 1;
  }

  throw new Error(
    `No free port found in range ${PORT}-${PORT + attempts - 1}. Set PORT manually and retry.`,
  );
}

startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
