const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const statusEl = document.getElementById('status');

const setStatus = (message) => {
  statusEl.textContent = message;
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
};

const renderTasks = (tasks) => {
  taskList.innerHTML = '';

  if (!tasks.length) {
    taskList.innerHTML = '<li class="empty">No tasks yet. Add your first task!</li>';
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = 'task-item';

    const title = document.createElement('span');
    title.className = `task-title ${task.completed ? 'completed' : ''}`;
    title.textContent = task.title;

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const completeButton = document.createElement('button');
    completeButton.textContent = task.completed ? 'Undo' : 'Complete';
    completeButton.addEventListener('click', async () => {
      try {
        await request(`/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ completed: !task.completed })
        });
        await loadTasks();
        setStatus('Task updated successfully.');
      } catch (error) {
        setStatus(error.message);
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      try {
        await request(`/tasks/${task.id}`, { method: 'DELETE' });
        await loadTasks();
        setStatus('Task deleted.');
      } catch (error) {
        setStatus(error.message);
      }
    });

    actions.append(completeButton, deleteButton);
    item.append(title, actions);
    taskList.append(item);
  });
};

const loadTasks = async () => {
  try {
    const data = await request('/tasks');
    renderTasks(data.tasks);
  } catch (error) {
    setStatus(error.message);
  }
};

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();

  if (!title) {
    setStatus('Please enter a task title.');
    return;
  }

  try {
    await request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title })
    });

    taskInput.value = '';
    await loadTasks();
    setStatus('Task created.');
  } catch (error) {
    setStatus(error.message);
  }
});

loadTasks();
