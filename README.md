# StudyFlow 📚

StudyFlow is a full-stack smart study planner built with **React, Node.js, Express and SQLite**. It helps students decide what to work on first by combining deadline urgency, assignment importance and estimated workload.

## Features

- Responsive React dashboard
- Create and delete courses
- Create, complete and delete study tasks
- SQLite persistence
- RESTful Express API
- Automatic study-priority scoring
- Recommended study plan
- Upcoming deadline view
- Seed data on first launch

## Tech stack

- React 18 + Vite
- Node.js + Express
- SQLite via better-sqlite3
- Axios
- Lucide React icons
- Plain CSS with responsive layouts

## Run locally

Requirements: Node.js 18+

```bash
npm run install:all
npm run dev
```

Open **http://localhost:5173**.

The API runs at **http://localhost:5001**.

To run separately:

```bash
npm run server
npm run client
```

## API endpoints

| Method | Endpoint           | Purpose                                |
| ------ | ------------------ | -------------------------------------- |
| GET    | `/api/courses`     | List courses                           |
| POST   | `/api/courses`     | Create course                          |
| DELETE | `/api/courses/:id` | Delete course                          |
| GET    | `/api/tasks`       | List tasks                             |
| POST   | `/api/tasks`       | Create task                            |
| PUT    | `/api/tasks/:id`   | Update task                            |
| DELETE | `/api/tasks/:id`   | Delete task                            |
| GET    | `/api/dashboard`   | Dashboard statistics + recommendations |
| POST   | `/api/study-plan`  | Generate a prioritized study plan      |

## How the recommendation algorithm works

The project intentionally uses a simple deterministic algorithm instead of an external AI service. Every open task receives a score:

```text
score = urgency × 0.50 + importance × 0.30 + workload × 0.20
```

### Urgency

Urgency starts at 10 for tasks due today and decreases as the deadline moves further away.

### Importance

The student selects importance from 1–5. It is converted to a 2–10 range.

### Workload

Estimated hours are converted into a 0–10 workload value, capped at 10 so one very large assignment does not dominate everything else.

The backend sorts open tasks by descending score and returns the top tasks as the recommended plan.

## Architecture

```text
React UI
   |
   | HTTP / JSON
   v
Express REST API
   |
   v
SQLite database
```

The frontend is responsible for presentation and user interaction. The backend owns validation, persistence, dashboard calculations and recommendation logic.

## Interview explanation

### Why React?

React makes it easy to break the dashboard into reusable components such as statistics cards, task rows and modals. State is kept in the top-level app because the project is small and does not need Redux.

### Why Node/Express?

The frontend and backend can both use JavaScript, which makes development quick and keeps the project approachable. Express also makes REST endpoints straightforward to organize.

### Why SQLite?

The app is designed for a single student, so a full database server would add unnecessary setup. SQLite gives real persistence while keeping the project portable.

### Why calculate the score on the backend?

The recommendation is business logic, so putting it on the server gives the application one consistent source of truth. The frontend only displays the result.

### What would you improve next?

- User authentication and separate student accounts
- Calendar integration
- Drag-and-drop study scheduling
- Historical productivity analytics
- Notifications for approaching deadlines
- PostgreSQL for a multi-user production deployment
- Unit and integration tests

## Project structure

```text
studyflow/
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src.js
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```
