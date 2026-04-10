# Task Manager App

A simple full stack Task Manager application with a Node.js backend (no external dependencies) and a vanilla HTML/CSS/JavaScript frontend.

## Features

- View all tasks
- Add a task
- Mark a task as completed (and undo completion)
- Delete a task
- REST API with validation and JSON responses

## Tech Stack

- Node.js
- Node.js built-in `http` module
- Vanilla HTML/CSS/JavaScript

## Project Structure

```
.
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server.js
└── README.md
```

## Setup Instructions

1. Start the app:
   ```bash
   npm start
   ```
2. Open in browser:
   ```
   http://localhost:3000
   ```

## API Endpoints

### `GET /tasks`
Returns all tasks.

Example response:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Sample Task",
      "completed": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /tasks`
Creates a task.

Request body:
```json
{ "title": "Buy groceries" }
```

Validation:
- `title` is required
- `title` must be a non-empty string

### `PATCH /tasks/:id`
Updates a task's `title` and/or `completed` status.

Request body examples:
```json
{ "completed": true }
```
```json
{ "title": "Updated title" }
```

Validation:
- `id` must be a positive integer
- if provided, `title` must be a non-empty string
- if provided, `completed` must be a boolean

### `DELETE /tasks/:id`
Deletes a task.

Validation:
- `id` must be a positive integer

## Notes

- Data is stored in memory and resets when the server restarts.
