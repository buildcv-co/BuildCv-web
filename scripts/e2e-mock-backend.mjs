import http from "node:http";

const PORT = 4018;
const DEFAULT_USER = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-06-25T10:00:00.000Z",
  lastLoginAt: "2026-06-27T10:00:00.000Z",
};

let user = { ...DEFAULT_USER };

function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    json(res, 400, { error: "Bad request" });
    return;
  }

  if (req.method === "POST" && req.url === "/__test/reset") {
    const body = await readJson(req);
    user = {
      ...DEFAULT_USER,
      email: typeof body.email === "string" ? body.email : DEFAULT_USER.email,
      name: typeof body.name === "string" ? body.name : DEFAULT_USER.name,
    };
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/api/v1/auth/session") {
    json(res, 200, {
      jwt: "mock-backend-jwt-for-playwright",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      user: { id: user.userId, email: user.email, name: user.name },
    });
    return;
  }

  if (req.url === "/api/v1/user/data") {
    if (req.method === "GET") {
      json(res, 200, user);
      return;
    }
    if (req.method === "PUT") {
      const body = await readJson(req);
      user = {
        ...user,
        name: typeof body.name === "string" && body.name ? body.name : user.name,
        email: typeof body.email === "string" && body.email ? body.email : user.email,
      };
      json(res, 200, user);
      return;
    }
    if (req.method === "DELETE") {
      json(res, 200, { message: "User data deleted" });
      return;
    }
  }

  if (req.method === "POST" && req.url === "/api/v1/auth/logout") {
    json(res, 200, { message: "Logged out successfully" });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    process.stdout.write(`BuildCv mock backend already listening on ${PORT}\n`);
    process.exit(0);
    return;
  }
  throw err;
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`BuildCv mock backend listening on ${PORT}\n`);
});
