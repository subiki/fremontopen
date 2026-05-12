/**
 * Dev wrapper for Expo/Metro on Replit.
 *
 * Replit's workflow port detection for Expo artifacts uses the expo-domain
 * router which proxies through the Expo dev domain. Metro takes ~20s to bind,
 * so this wrapper:
 *
 *   1. Immediately opens an HTTP+WebSocket proxy on $PORT.
 *   2. Starts `expo start` on Metro's default port (8081) in the background.
 *   3. Responds 200 to health checks during startup.
 *   4. Once Metro is healthy, forwards all HTTP and WebSocket traffic to it.
 *
 * WebSocket support is required for Expo Go native connections.
 * BASE_PATH prefix (e.g. "/mobile/") is stripped before forwarding to Metro.
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const PROXY_PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = 8081;
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/$/, "");
const SCRIPT_DIR = path.resolve(__dirname, "..");

const EXPO_PACKAGER_PROXY_URL =
  process.env.EXPO_PACKAGER_PROXY_URL ||
  `https://${process.env.REPLIT_EXPO_DEV_DOMAIN || "localhost"}`;
const EXPO_PUBLIC_DOMAIN =
  process.env.EXPO_PUBLIC_DOMAIN || process.env.REPLIT_DEV_DOMAIN || "";
const EXPO_PUBLIC_REPL_ID =
  process.env.EXPO_PUBLIC_REPL_ID || process.env.REPL_ID || "";
const REACT_NATIVE_PACKAGER_HOSTNAME =
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME ||
  process.env.REPLIT_DEV_DOMAIN ||
  "";

let metroReady = false;
let expoProcess = null;

function log(msg) {
  process.stdout.write(`[dev] ${msg}\n`);
}

function stripBasePath(url) {
  if (BASE_PATH && url.startsWith(BASE_PATH)) {
    const stripped = url.slice(BASE_PATH.length) || "/";
    return stripped.startsWith("/") ? stripped : "/" + stripped;
  }
  return url;
}

function forwardHttp(req, res) {
  const targetPath = stripBasePath(req.url);
  const options = {
    hostname: "localhost",
    port: METRO_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    }
  });

  req.pipe(proxy, { end: true });
}

const server = http.createServer((req, res) => {
  const normalizedUrl = stripBasePath(req.url);

  if (metroReady) {
    forwardHttp(req, res);
    return;
  }

  if (normalizedUrl === "/status" || normalizedUrl === "/" || normalizedUrl === "") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("CueStats Mobile — Metro starting…\n");
    return;
  }

  forwardHttp(req, res);
});

server.on("upgrade", (req, clientSocket, head) => {
  const targetSocket = net.connect(METRO_PORT, "localhost", () => {
    const rawRequest =
      `${req.method} ${stripBasePath(req.url)} HTTP/1.1\r\n` +
      Object.entries({ ...req.headers, host: `localhost:${METRO_PORT}` })
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n") +
      "\r\n\r\n";
    targetSocket.write(rawRequest);
    if (head && head.length) targetSocket.write(head);
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);
  });

  targetSocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => targetSocket.destroy());
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  log(`Proxy listening on port ${PROXY_PORT} (base: "${BASE_PATH}")`);
  startExpo();
});

function startExpo() {
  log("Starting Expo/Metro on port " + METRO_PORT + "…");

  expoProcess = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(METRO_PORT)],
    {
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...process.env,
        PORT: String(METRO_PORT),
        EXPO_PACKAGER_PROXY_URL,
        EXPO_PUBLIC_DOMAIN,
        EXPO_PUBLIC_REPL_ID,
        REACT_NATIVE_PACKAGER_HOSTNAME,
      },
      cwd: SCRIPT_DIR,
      detached: false,
    },
  );

  expoProcess.on("exit", (code) => {
    log(`Expo exited with code ${code}`);
    process.exit(code ?? 1);
  });

  pollMetro();
}

function pollMetro() {
  const interval = setInterval(() => {
    const req = http.get(
      `http://localhost:${METRO_PORT}/status`,
      { timeout: 2000 },
      (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          metroReady = true;
          log("Metro is ready — forwarding to port " + METRO_PORT);
        }
        res.resume();
      },
    );
    req.on("error", () => {});
    req.on("timeout", () => req.destroy());
  }, 2000);
}

function cleanup() {
  if (expoProcess) expoProcess.kill();
  server.close();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("SIGHUP", cleanup);
