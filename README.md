# Leap Career Bot

Leap Career Bot is a full-stack AI-powered career coach built as a monorepo for the Leap Scholar assignment. It helps users upload a resume, get guided career-path exploration, and receive a concrete action plan.

## Live Demo

Placeholder: `TBD`

## Local Setup

1. Clone the repository.
2. Run `npm install` at the repo root.
3. Copy values from `.env.example` into the backend and frontend environment files as needed.
4. Start both apps with `npm run dev`.

## Architecture

```text
leap-career-bot/
├── package.json
├── packages/
│   ├── backend/    -> Express API, PDF parsing, Claude integration, session store
│   └── frontend/   -> React + Vite UI for upload, chat, path cards, action plan
└── shared flow     -> Resume upload -> session creation -> guided chat -> path selection
```

## Key Design Decisions

- npm workspaces keep backend and frontend dependencies isolated while preserving a single repo workflow.
- A root `dev` script with `concurrently` makes local development feel like one app instead of two separate projects.
- Environment variables are documented at the root so onboarding stays simple and predictable.
- The initial README is intentionally assignment-focused, with room to evolve as implementation details solidify.
- The root stays minimal so package-level responsibilities remain clear as the monorepo grows.

## What I Would Improve With More Time

- Add deployment instructions and a real live demo link once hosting is set up.
- Document package-level scripts, troubleshooting, and common development workflows.
- Expand the architecture section with request/response flows and operational considerations.
