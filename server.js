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

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const success = (res, statusCode, payload) => sendJson(res, statusCode, { success: true, ...payload });
const failure = (res, statusCode, message) => sendJson(res, statusCode, { success: false, error: message });

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isBoolean = (value) => typeof value === 'boolean';

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
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', () => reject(new Error('Error reading request body')));
  });

const createTask = (title) => ({
  id: nextId++,
  title: title.trim(),
  completed: false,
  createdAt: new Date().toISOString()
});

const serveStaticFile = (res, pathname) => {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requestedPath).replace(/^\.+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    failure(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      failure(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
};

const getTaskId = (pathname) => {
  const match = pathname.match(/^\/tasks\/([^/]+)$/);

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  if (!Number.isInteger(id) || id <= 0) {
    return Number.NaN;
  }

  return id;
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = requestUrl;
  const method = req.method;

  if (method === 'GET' && pathname === '/tasks') {
    success(res, 200, { tasks });
    return;
  }

  if (method === 'POST' && pathname === '/tasks') {
    try {
      const body = await parseBody(req);

      if (!isNonEmptyString(body.title)) {
        failure(res, 400, 'title is required and must be a non-empty string');
        return;
      }

      const task = createTask(body.title);
      tasks.push(task);
      success(res, 201, { message: 'Task created', task });
    } catch (error) {
      failure(res, 400, error.message);
    }

    return;
  }

  const taskId = getTaskId(pathname);

  if ((method === 'PATCH' || method === 'DELETE') && Number.isNaN(taskId)) {
    failure(res, 400, 'Invalid task id');
    return;
  }

  if (method === 'PATCH' && taskId !== null) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      failure(res, 404, 'Task not found');
      return;
    }

    try {
      const body = await parseBody(req);

      if (body.completed === undefined && body.title === undefined) {
        failure(res, 400, 'Provide at least one field to update');
        return;
      }

      if (body.completed !== undefined) {
        if (!isBoolean(body.completed)) {
          failure(res, 400, 'completed must be a boolean');
          return;
        }
        task.completed = body.completed;
      }

      if (body.title !== undefined) {
        if (!isNonEmptyString(body.title)) {
          failure(res, 400, 'title must be a non-empty string');
          return;
        }
        task.title = body.title.trim();
      }

      success(res, 200, { message: 'Task updated', task });
    } catch (error) {
      failure(res, 400, error.message);
    }

    return;
  }

  if (method === 'DELETE' && taskId !== null) {
    const index = tasks.findIndex((item) => item.id === taskId);

    if (index === -1) {
      failure(res, 404, 'Task not found');
      return;
    }

    const [task] = tasks.splice(index, 1);
    success(res, 200, { message: 'Task deleted', task });
    return;
  }

  if (method === 'GET') {
    serveStaticFile(res, pathname);
    return;
  }

  failure(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log(`Task Manager app running on http://localhost:${PORT}`);
});
