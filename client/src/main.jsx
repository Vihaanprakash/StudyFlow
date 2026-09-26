import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const API = "http://localhost:5001/api";
const api = axios.create({ baseURL: API });

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function daysUntil(value) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(value + "T00:00:00") - a) / 86400000);
}
function dueLabel(value) {
  const d = daysUntil(value);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due ${formatDate(value)}`;
}

function App() {
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const [c, t, d] = await Promise.all([
        api.get("/courses"),
        api.get("/tasks"),
        api.get("/dashboard"),
      ]);
      setCourses(c.data);
      setTasks(t.data);
      setDashboard(d.data);
    } catch {
      setError(
        "Could not connect to the server. Start the backend with npm run server."
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleTask(task) {
    await api.put(`/tasks/${task.id}`, { ...task, completed: !task.completed });
    load();
  }
  async function deleteTask(id) {
    if (confirm("Delete this task?")) {
      await api.delete(`/tasks/${id}`);
      load();
    }
  }
  async function generatePlan() {
    const res = await api.post("/study-plan");
    setPlan(res.data.plan);
  }
  async function addTask(data) {
    await api.post("/tasks", data);
    setShowAdd(false);
    load();
  }
  async function addCourse(name) {
    await api.post("/courses", { name });
    load();
  }
  async function deleteCourse(id) {
    if (confirm("Delete this course and its tasks?")) {
      await api.delete(`/courses/${id}`);
      load();
    }
  }

  const upcoming = useMemo(
    () =>
      [...tasks]
        .filter((t) => !t.completed)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 5),
    [tasks]
  );
  if (loading)
    return (
      <div className="loading">
        <div className="logo-mark">
          <BookOpen size={22} />
        </div>
        <h2>Loading StudyFlow...</h2>
      </div>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-mark">
            <BookOpen size={21} />
          </div>
          <span>StudyFlow</span>
        </div>
        <nav>
          <button className="nav-item active">
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className="nav-item" onClick={() => setShowCourses(true)}>
            <BookOpen size={18} /> Courses{" "}
            <span className="nav-count">{courses.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <Sparkles size={17} />
            <div>
              <strong>Study smarter</strong>
              <p>Prioritize work by urgency, importance and workload.</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">STUDENT DASHBOARD</p>
            <h1>Good morning 👋</h1>
            <p className="subtitle">
              Here’s what deserves your attention today.
            </p>
          </div>
          <button className="primary" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Add task
          </button>
        </header>
        {error && <div className="error">{error}</div>}
        <section className="stats">
          <Stat
            icon={<CheckCircle2 />}
            label="Tasks completed"
            value={`${dashboard?.completionRate ?? 0}%`}
            hint={`${dashboard?.completedHours ?? 0}h finished`}
          />
          <Stat
            icon={<Clock3 />}
            label="Due soon"
            value={dashboard?.dueSoon ?? 0}
            hint="Next 3 days"
          />
          <Stat
            icon={<CalendarDays />}
            label="Open tasks"
            value={dashboard?.open ?? 0}
            hint={`${dashboard?.totalHours ?? 0}h estimated`}
          />
          <Stat
            icon={<Zap />}
            label="Courses"
            value={courses.length}
            hint="Active courses"
          />
        </section>
        <div className="content-grid">
          <section className="card plan-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">RECOMMENDED</p>
                <h2>Today's study plan</h2>
              </div>
              <button className="secondary" onClick={generatePlan}>
                <Sparkles size={16} /> Generate plan
              </button>
            </div>
            {(plan || dashboard?.recommended || []).length === 0 ? (
              <Empty />
            ) : (
              <div className="task-list">
                {(plan || dashboard.recommended).map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    rank={i + 1}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            )}
            <div className="algorithm-note">
              <Sparkles size={16} />
              <span>
                <strong>How it works:</strong> urgency 50% · importance 30% ·
                workload 20%
              </span>
            </div>
          </section>
          <section className="card deadlines">
            <div className="card-head">
              <div>
                <p className="eyebrow">UPCOMING</p>
                <h2>Next deadlines</h2>
              </div>
              <CalendarDays size={20} />
            </div>
            {upcoming.length ? (
              upcoming.map((t) => (
                <div className="deadline" key={t.id}>
                  <span
                    className="dot"
                    style={{ background: t.course_color }}
                  />
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {t.course_name} · {t.estimated_hours}h
                    </small>
                  </div>
                  <span className={daysUntil(t.due_date) <= 1 ? "urgent" : ""}>
                    {dueLabel(t.due_date)}
                  </span>
                </div>
              ))
            ) : (
              <Empty text="No upcoming tasks." />
            )}
          </section>
        </div>
        <section className="card all-tasks">
          <div className="card-head">
            <div>
              <p className="eyebrow">WORKLOAD</p>
              <h2>All tasks</h2>
            </div>
            <span className="muted">{tasks.length} total</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Course</th>
                  <th>Due</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="table-task">
                        <button
                          className={`check ${t.completed ? "checked" : ""}`}
                          onClick={() => toggleTask(t)}
                        >
                          {t.completed && <CheckCircle2 size={17} />}
                        </button>
                        <span className={t.completed ? "done" : ""}>
                          {t.title}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="course-pill">
                        <i style={{ background: t.course_color }} />
                        {t.course_name}
                      </span>
                    </td>
                    <td>{dueLabel(t.due_date)}</td>
                    <td>{t.estimated_hours}h</td>
                    <td>
                      <span
                        className={`status ${
                          t.completed ? "complete" : "open"
                        }`}
                      >
                        {t.completed ? "Completed" : "Open"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {showAdd && (
        <AddTaskModal
          courses={courses}
          onClose={() => setShowAdd(false)}
          onSave={addTask}
        />
      )}
      {showCourses && (
        <CoursesModal
          courses={courses}
          onClose={() => setShowCourses(false)}
          onAdd={addCourse}
          onDelete={deleteCourse}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value, hint }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </div>
  );
}
function TaskRow({ task, rank, onToggle, onDelete }) {
  return (
    <div className="task-row">
      <div className="rank">{rank}</div>
      <button
        className={`check ${task.completed ? "checked" : ""}`}
        onClick={() => onToggle(task)}
      >
        {task.completed && <CheckCircle2 size={17} />}
      </button>
      <div className="task-main">
        <div className="task-title">
          <strong className={task.completed ? "done" : ""}>{task.title}</strong>
          <span className="score">Score {task.priority_score}</span>
        </div>
        <div className="task-meta">
          <span>{task.course_name}</span>
          <span>•</span>
          <span>{dueLabel(task.due_date)}</span>
          <span>•</span>
          <span>{task.estimated_hours}h</span>
        </div>
      </div>
      <button className="icon-btn" onClick={() => onDelete(task.id)}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}
function Empty({ text = "Add a task to start building your plan." }) {
  return (
    <div className="empty">
      <Sparkles size={22} />
      <p>{text}</p>
    </div>
  );
}

function AddTaskModal({ courses, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "",
    course_id: courses[0]?.id || "",
    due_date: new Date().toISOString().slice(0, 10),
    estimated_hours: 2,
    priority: 3,
  });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <Modal title="Add a task" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            course_id: Number(form.course_id),
            estimated_hours: Number(form.estimated_hours),
            priority: Number(form.priority),
          });
        }}
      >
        <label>
          Task name
          <input
            name="title"
            value={form.title}
            onChange={change}
            placeholder="e.g. Build REST API"
            required
            autoFocus
          />
        </label>
        <label>
          Course
          <select name="course_id" value={form.course_id} onChange={change}>
            {courses.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Due date
            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={change}
              required
            />
          </label>
          <label>
            Hours
            <input
              type="number"
              min="0.5"
              step="0.5"
              name="estimated_hours"
              value={form.estimated_hours}
              onChange={change}
            />
          </label>
        </div>
        <label>
          Importance <span className="range-value">{form.priority}/5</span>
          <input
            type="range"
            min="1"
            max="5"
            name="priority"
            value={form.priority}
            onChange={change}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary">Add task</button>
        </div>
      </form>
    </Modal>
  );
}
function CoursesModal({ courses, onClose, onAdd, onDelete }) {
  const [name, setName] = useState("");
  return (
    <Modal title="Courses" onClose={onClose}>
      <div className="course-list">
        {courses.map((c) => (
          <div className="course-item" key={c.id}>
            <span className="dot" style={{ background: c.color }} />
            <div>
              <strong>{c.name}</strong>
              <small>{c.task_count || 0} tasks</small>
            </div>
            <button className="icon-btn" onClick={() => onDelete(c.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onAdd(name.trim());
            setName("");
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New course name"
        />
        <button className="primary">
          <Plus size={17} />
        </button>
      </form>
    </Modal>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
