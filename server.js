const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

let tasks = [];
let nextId = 1;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isBoolean = (value) => typeof value === 'boolean';

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', () => reject(new Error('Error reading request body')));
  });

const serveStaticFile = (res, pathname) => {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requestedPath).replace(/^\.+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = requestUrl;
  const method = req.method;

  if (method === 'GET' && pathname === '/tasks') {
    sendJson(res, 200, { tasks });
    return;
  }

  if (method === 'POST' && pathname === '/tasks') {
    try {
      const body = await parseBody(req);

      if (!isNonEmptyString(body.title)) {
        sendJson(res, 400, { error: 'title is required and must be a non-empty string' });
        return;
      }

      const task = {
        id: nextId++,
        title: body.title.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };

      tasks.push(task);
      sendJson(res, 201, { message: 'Task created', task });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }

    return;
  }

  const taskRouteMatch = pathname.match(/^\/tasks\/([^/]+)$/);

  if (taskRouteMatch && (method === 'PATCH' || method === 'DELETE')) {
    const id = Number(taskRouteMatch[1]);

    if (!Number.isInteger(id) || id <= 0) {
      sendJson(res, 400, { error: 'Invalid task id' });
      return;
    }
  }

  if (taskRouteMatch && method === 'PATCH') {
    const id = Number(taskRouteMatch[1]);
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    try {
      const body = await parseBody(req);

      if (body.title !== undefined) {
        if (!isNonEmptyString(body.title)) {
          sendJson(res, 400, { error: 'title must be a non-empty string' });
          return;
        }
        task.title = body.title.trim();
      }

      if (body.completed !== undefined) {
        if (!isBoolean(body.completed)) {
          sendJson(res, 400, { error: 'completed must be a boolean' });
          return;
        }
        task.completed = body.completed;
      }

      sendJson(res, 200, { message: 'Task updated', task });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }

    return;
  }

  if (taskRouteMatch && method === 'DELETE') {
    const id = Number(taskRouteMatch[1]);
    const index = tasks.findIndex((item) => item.id === id);

    if (index === -1) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    const [deletedTask] = tasks.splice(index, 1);
    sendJson(res, 200, { message: 'Task deleted', task: deletedTask });
    return;
  }

  if (method === 'GET') {
    serveStaticFile(res, pathname);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Task Manager app running on http://localhost:${PORT}`);
});
