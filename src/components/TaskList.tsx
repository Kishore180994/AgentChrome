import React, { useState, useEffect } from "react";
import api, { Task } from "../services/api";

interface TaskListProps {
  onTaskSelect?: (task: Task) => void;
}

/**
 * Component for displaying a list of tasks from the backend
 */
const TaskList: React.FC<TaskListProps> = ({ onTaskSelect }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskDescription, setNewTaskDescription] = useState<string>("");

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Function to fetch tasks from the API
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedTasks = await api.tasks.getAllTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setError("Failed to load tasks. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new task
  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTaskTitle.trim()) {
      setError("Task title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newTask = await api.tasks.createTask({
        title: newTaskTitle,
        description: newTaskDescription,
      });

      // Add the new task to the list
      setTasks([...tasks, newTask]);

      // Clear the form
      setNewTaskTitle("");
      setNewTaskDescription("");
    } catch (err) {
      console.error("Failed to create task:", err);
      setError("Failed to create task. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Function to toggle task completion status
  const toggleTaskCompletion = async (task: Task) => {
    try {
      const updatedTask = await api.tasks.updateTask(task._id, {
        completed: !task.completed,
      });

      // Update the task in the list
      setTasks(tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
    } catch (err) {
      console.error("Failed to update task:", err);
      setError("Failed to update task. Please try again later.");
    }
  };

  // Function to delete a task
  const deleteTask = async (taskId: string) => {
    try {
      await api.tasks.deleteTask(taskId);

      // Remove the task from the list
      setTasks(tasks.filter((task) => task._id !== taskId));
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError("Failed to delete task. Please try again later.");
    }
  };

  return (
    <div className="d4m-space-y-4">
      <h2 className="d4m-text-xl d4m-font-semibold d4m-mb-4">Tasks</h2>

      {/* Error message */}
      {error && (
        <div className="d4m-bg-red-100 d4m-border d4m-border-red-400 d4m-text-red-700 d4m-px-4 d4m-py-3 d4m-rounded d4m-mb-4">
          {error}
        </div>
      )}

      {/* New task form */}
      <form onSubmit={createTask} className="d4m-space-y-3 d4m-mb-6">
        <div>
          <label
            htmlFor="taskTitle"
            className="d4m-block d4m-text-sm d4m-font-medium d4m-mb-1"
          >
            Task Title
          </label>
          <input
            id="taskTitle"
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="d4m-w-full d4m-px-3 d4m-py-2 d4m-border d4m-border-gray-300 d4m-rounded-md d4m-shadow-sm"
            placeholder="Enter task title"
          />
        </div>

        <div>
          <label
            htmlFor="taskDescription"
            className="d4m-block d4m-text-sm d4m-font-medium d4m-mb-1"
          >
            Description
          </label>
          <textarea
            id="taskDescription"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            className="d4m-w-full d4m-px-3 d4m-py-2 d4m-border d4m-border-gray-300 d4m-rounded-md d4m-shadow-sm"
            placeholder="Enter task description"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="d4m-bg-blue-500 d4m-text-white d4m-px-4 d4m-py-2 d4m-rounded-md d4m-hover:bg-blue-600 d4m-transition-colors d4m-disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Task"}
        </button>
      </form>

      {/* Task list */}
      {loading && tasks.length === 0 ? (
        <div className="d4m-flex d4m-justify-center d4m-py-8">
          <div className="d4m-animate-spin d4m-rounded-full d4m-h-8 d4m-w-8 d4m-border-t-2 d4m-border-b-2 d4m-border-blue-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="d4m-text-center d4m-py-8 d4m-text-gray-500">
          No tasks found. Create your first task above.
        </div>
      ) : (
        <ul className="d4m-space-y-2">
          {tasks.map((task) => (
            <li
              key={task._id}
              className="d4m-border d4m-border-gray-200 d4m-rounded-md d4m-p-4 d4m-hover:bg-gray-50 d4m-transition-colors"
            >
              <div className="d4m-flex d4m-items-start d4m-justify-between">
                <div className="d4m-flex d4m-items-center d4m-space-x-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompletion(task)}
                    className="d4m-h-5 d4m-w-5 d4m-rounded d4m-border-gray-300 d4m-text-blue-600"
                  />
                  <div
                    className={`d4m-flex-1 ${
                      task.completed ? "d4m-line-through d4m-text-gray-500" : ""
                    }`}
                    onClick={() => onTaskSelect && onTaskSelect(task)}
                  >
                    <h3 className="d4m-font-medium">{task.title}</h3>
                    {task.description && (
                      <p className="d4m-text-sm d4m-text-gray-600 d4m-mt-1">
                        {task.description}
                      </p>
                    )}
                    <p className="d4m-text-xs d4m-text-gray-400 d4m-mt-2">
                      Created: {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task._id)}
                  className="d4m-text-red-500 d4m-hover:text-red-700 d4m-transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="d4m-h-5 d4m-w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList;
