/**
 * Leviathan Ink — Phase 1 shared book
 * One Node process serves the app and stores one shop book.
 * Not the full production spec. No card data. Change SHOP_KEY before public use.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8787;
const SHOP_KEY = process.env.SHOP_KEY || "leviathan-floor";
const DATA = process.env.DATA_FILE || path.join(__dirname, "data", "book.json");
const PUBLIC = path.join(__dirname, "public");

const empty = () => ({
  cfg: null,
  bookings: [],
  messages: [],
  payroll: [],
  accounts: [],
  updatedAt: 0
});

function load() {
  try {
    return Object.assign(empty(), JSON.parse(fs.readFileSync(DATA, "utf8")));
  } catch (e) {
    return empty();
  }
}

function persist(state) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  const tmp = DATA + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, DATA);
}

let state = load();

function send(res, code, body, headers) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(code, Object.assign({
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Shop-Key",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS"
  }, headers || {}));
  res.end(data);
}

function keyOk(req) {
  const k = req.headers["x-shop-key"];
  if (!SHOP_KEY) return true;
  return !k || k === SHOP_KEY;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", c => {
      n += c.length;
      if (n > 25 * 1024 * 1024) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");

  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true, shop: "Leviathan Ink", bookings: (state.bookings || []).length, updatedAt: state.updatedAt });
  }

  if (url.pathname === "/api/state" && req.method === "GET") {
    if (!keyOk(req)) return send(res, 401, { error: "Bad shop key" });
    return send(res, 200, {
      cfg: state.cfg,
      bookings: state.bookings || [],
      messages: state.messages || [],
      payroll: state.payroll || [],
      accounts: state.accounts || [],
      updatedAt: state.updatedAt || 0
    });
  }

  if (url.pathname === "/api/state" && req.method === "PUT") {
    if (!keyOk(req)) return send(res, 401, { error: "Bad shop key" });
    try {
      const incoming = JSON.parse(await readBody(req));
      state = {
        cfg: incoming.cfg != null ? incoming.cfg : state.cfg,
        bookings: Array.isArray(incoming.bookings) ? incoming.bookings : state.bookings,
        messages: Array.isArray(incoming.messages) ? incoming.messages : state.messages,
        payroll: Array.isArray(incoming.payroll) ? incoming.payroll : state.payroll,
        accounts: Array.isArray(incoming.accounts) ? incoming.accounts : state.accounts,
        updatedAt: Date.now()
      };
      persist(state);
      return send(res, 200, { ok: true, updatedAt: state.updatedAt });
    } catch (e) {
      return send(res, 400, { error: "Invalid body" });
    }
  }

  let file = url.pathname === "/" ? "/index.html" : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) return send(res, 403, "Forbidden");
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, "Not found");
    send(res, 200, buf.toString("utf8"), { "Content-Type": mime(full) });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Leviathan live book on " + PORT);
});
