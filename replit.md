# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Edge-AI Inhaler Usage Monitor

A health monitoring web app for asthma patients that simulates inhaler usage tracking with Edge AI decision-making.

### Features
- **Dashboard**: Today's usage stats, last usage time, alert count, status badge
- **Use Inhaler button**: Records usage with random inhalation strength (Low/Medium/High)
- **Edge AI Simulation**: Detects overuse (>6 uses/day), rapid usage (>3 in 10 min), and improper technique (Low strength)
- **Alert system**: Stores and displays triggered alerts with type-coded messaging
- **History page**: Full usage log with hourly BarChart (Recharts)
- **Alerts page**: Complete alert history with type-based styling
- **Dark mode**: Toggle via next-themes

### Tech
- Frontend: React + Vite (`artifacts/inhaler-monitor`)
- Backend: Express 5 (`artifacts/api-server`)
- Database: PostgreSQL via Drizzle ORM
- Charts: Recharts
- UI: Tailwind CSS + shadcn/ui components

### API Endpoints
- `POST /api/use-inhaler` — Record usage, run Edge AI, return result
- `GET /api/stats` — Today's usage stats + status
- `GET /api/usage-logs` — All usage records
- `GET /api/alerts` — Alert history
- `GET /api/alerts/unread-count` — Unread alert badge count
- `GET /api/usage-chart` — Hourly chart data for today

### DB Tables
- `inhaler_usage` — Records each usage event (strength, alert flag, alertType, timestamp)
- `alerts` — Records triggered alerts (type, message, timestamp)
