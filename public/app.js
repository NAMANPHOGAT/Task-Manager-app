const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const statusEl = document.getElementById('status');
const totalCountEl = document.getElementById('total-count');
const completedCountEl = document.getElementById('completed-count');
const filterButtons = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';
let allTasks = [];

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

const applyFilter = (tasks) => {
  if (currentFilter === 'active') {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === 'completed') {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
};

const updateSummary = (tasks) => {
  totalCountEl.textContent = tasks.length;
  completedCountEl.textContent = tasks.filter((task) => task.completed).length;
};

const renderTasks = (tasks) => {
  const visibleTasks = applyFilter(tasks);
  taskList.innerHTML = '';

  if (!visibleTasks.length) {
    taskList.innerHTML = '<li class="empty">No tasks in this view.</li>';
    return;
  }

  visibleTasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = 'task-item';

    const title = document.createElement('span');
    title.className = `task-title ${task.completed ? 'completed' : ''}`;
    title.textContent = task.title;

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const toggleButton = document.createElement('button');
    toggleButton.className = 'toggle';
    toggleButton.textContent = task.completed ? 'Undo' : 'Complete';
    toggleButton.addEventListener('click', async () => {
      try {
        await request(`/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ completed: !task.completed })
        });
        await loadTasks();
        setStatus('Task updated.');
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

    actions.append(toggleButton, deleteButton);
    item.append(title, actions);
    taskList.append(item);
  });
};

const loadTasks = async () => {
  try {
    const data = await request('/tasks');
    allTasks = data.tasks;
    updateSummary(allTasks);
    renderTasks(allTasks);
  } catch (error) {
    setStatus(error.message);
  }
};

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');

    renderTasks(allTasks);
  });
});

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
