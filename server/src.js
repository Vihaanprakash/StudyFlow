import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "studyflow.db"));
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1'
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    course_id INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    estimated_hours REAL NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
    completed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
  );
`);

const count = db.prepare("SELECT COUNT(*) AS count FROM courses").get().count;
if (count === 0) {
  const insertCourse = db.prepare(
    "INSERT INTO courses (name, color) VALUES (?, ?)"
  );
  const courses = [
    ["Data Structures", "#6366f1"],
    ["Database Systems", "#0ea5e9"],
    ["Web Development", "#14b8a6"],
    ["Operating Systems", "#f59e0b"],
  ];
  const ids = courses.map((c) => insertCourse.run(...c).lastInsertRowid);
  const insertTask = db.prepare(`INSERT INTO tasks
    (title, course_id, due_date, estimated_hours, priority, completed)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const now = new Date();
  const date = (days) =>
    new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
  [
    ["Binary Tree Assignment", ids[0], date(1), 3, 5, 0],
    ["SQL Optimization Project", ids[1], date(3), 4, 4, 0],
    ["React Quiz", ids[2], date(5), 1, 2, 0],
    ["Process Scheduling Notes", ids[3], date(2), 2, 3, 0],
    ["Normalization Practice", ids[1], date(7), 2, 3, 1],
  ].forEach((t) => insertTask.run(...t));
}

const taskQuery = `SELECT t.*, c.name AS course_name, c.color AS course_color
  FROM tasks t JOIN courses c ON c.id = t.course_id`;

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateString + "T00:00:00");
  return Math.ceil((due - today) / 86400000);
}

function priorityScore(task) {
  const days = Math.max(0, daysUntil(task.due_date));
  const urgency = days === 0 ? 10 : Math.max(1, 10 - days);
  const importance = Number(task.priority) * 2;
  const workload = Math.min(10, Number(task.estimated_hours) * 1.25);
  return Number((urgency * 0.5 + importance * 0.3 + workload * 0.2).toFixed(2));
}

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.get("/api/courses", (_, res) => {
  const courses = db
    .prepare(
      `SELECT c.*, COUNT(t.id) AS task_count,
    SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS completed_count
    FROM courses c LEFT JOIN tasks t ON t.course_id = c.id GROUP BY c.id ORDER BY c.id`
    )
    .all();
  res.json(courses);
});

app.post("/api/courses", (req, res) => {
  const { name, color = "#6366f1" } = req.body;
  if (!name?.trim())
    return res.status(400).json({ error: "Course name is required." });
  const result = db
    .prepare("INSERT INTO courses (name, color) VALUES (?, ?)")
    .run(name.trim(), color);
  res
    .status(201)
    .json(
      db
        .prepare("SELECT * FROM courses WHERE id = ?")
        .get(result.lastInsertRowid)
    );
});

app.delete("/api/courses/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM courses WHERE id = ?")
    .run(req.params.id);
  if (!result.changes)
    return res.status(404).json({ error: "Course not found." });
  res.status(204).end();
});

app.get("/api/tasks", (req, res) => {
  let tasks = db.prepare(`${taskQuery} ORDER BY due_date ASC`).all();
  if (req.query.status === "open") tasks = tasks.filter((t) => !t.completed);
  if (req.query.status === "completed")
    tasks = tasks.filter((t) => t.completed);
  res.json(tasks.map((t) => ({ ...t, priority_score: priorityScore(t) })));
});

app.post("/api/tasks", (req, res) => {
  const {
    title,
    course_id,
    due_date,
    estimated_hours = 1,
    priority = 3,
  } = req.body;
  if (!title?.trim() || !course_id || !due_date)
    return res
      .status(400)
      .json({ error: "Title, course, and due date are required." });
  const result = db
    .prepare(
      `INSERT INTO tasks
    (title, course_id, due_date, estimated_hours, priority) VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      course_id,
      due_date,
      Math.max(0.5, Number(estimated_hours)),
      Number(priority)
    );
  res
    .status(201)
    .json(
      db.prepare(`${taskQuery} WHERE t.id = ?`).get(result.lastInsertRowid)
    );
});

app.put("/api/tasks/:id", (req, res) => {
  const current = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);
  if (!current) return res.status(404).json({ error: "Task not found." });
  const next = { ...current, ...req.body };
  db.prepare(
    `UPDATE tasks SET title=?, course_id=?, due_date=?, estimated_hours=?, priority=?, completed=? WHERE id=?`
  ).run(
    next.title,
    next.course_id,
    next.due_date,
    Number(next.estimated_hours),
    Number(next.priority),
    next.completed ? 1 : 0,
    req.params.id
  );
  res.json(db.prepare(`${taskQuery} WHERE t.id = ?`).get(req.params.id));
});

app.delete("/api/tasks/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM tasks WHERE id = ?")
    .run(req.params.id);
  if (!result.changes)
    return res.status(404).json({ error: "Task not found." });
  res.status(204).end();
});

app.get("/api/dashboard", (_, res) => {
  const tasks = db.prepare(taskQuery).all();
  const open = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const dueSoon = open.filter((t) => daysUntil(t.due_date) <= 3).length;
  const totalHours = tasks.reduce(
    (sum, t) => sum + Number(t.estimated_hours),
    0
  );
  const completedHours = completed.reduce(
    (sum, t) => sum + Number(t.estimated_hours),
    0
  );
  const completionRate = tasks.length
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;
  const recommended = open
    .map((t) => ({ ...t, priority_score: priorityScore(t) }))
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 5);
  res.json({
    total: tasks.length,
    open: open.length,
    dueSoon,
    completionRate,
    totalHours,
    completedHours,
    recommended,
  });
});

app.post("/api/study-plan", (_, res) => {
  const tasks = db
    .prepare(taskQuery)
    .all()
    .filter((t) => !t.completed);
  const plan = tasks
    .map((t) => ({ ...t, priority_score: priorityScore(t) }))
    .sort((a, b) => b.priority_score - a.priority_score);
  res.json({ generatedAt: new Date().toISOString(), plan });
});

app.listen(PORT, () =>
  console.log(`StudyFlow API running on http://localhost:${PORT}`)
);
