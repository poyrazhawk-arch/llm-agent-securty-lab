import { createServer } from "node:http";
import { ask, buildIndex, audit, resetAudit } from "./lab.js";

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
  });

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/chat") {
      const { message, caller = "anonim" } = await readBody(req);
      if (!message) return json(res, 400, { error: "message gerekli" });
      return json(res, 200, await ask(message, caller));
    }
    if (req.method === "GET" && req.url === "/audit") return json(res, 200, audit);
    if (req.method === "POST" && req.url === "/reset") {
      resetAudit();
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: "POST /chat · GET /audit · POST /reset" });
  } catch (err) {
    json(res, 500, { error: String(err.message || err) });
  }
});

const port = Number(process.env.PORT || 3000);
buildIndex()
  .then((n) => console.log(`[lab] ${n} doküman indekslendi`))
  .catch((e) => console.error(`[lab] indeks kurulamadı: ${e.message}`))
  .finally(() => server.listen(port, () => console.log(`[lab] http://localhost:${port}`)));
