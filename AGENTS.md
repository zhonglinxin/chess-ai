# Repository Guidelines

## Project Structure & Module Organization
- `src/app` holds the Next.js App Router routes, layouts, and server actions (see `actions.ts`).
- `src/components` contains feature components; `src/components/ui` stores reusable UI primitives.
- `src/hooks` includes custom React hooks; `src/lib` provides shared utilities.
- `public` stores static assets such as icons and images.
- `docs` is reserved for additional documentation (currently empty).

## Build, Test, and Development Commands
- `pnpm dev` starts the local Next.js dev server at `http://localhost:3000`.
- `pnpm build` generates the production build artifacts.
- `pnpm start` runs the production server (run after `pnpm build`).
- `pnpm lint` runs ESLint with Next.js and TypeScript rules.

## Coding Style & Naming Conventions
- TypeScript + React (Next.js App Router); keep app code under `src/`.
- Follow existing formatting: 4-space indentation and single quotes in TS/TSX.
- File names use kebab-case (e.g., `analysis-panel.tsx`, `use-history.ts`).
- Component exports use PascalCase; hooks start with `use`.
- Prefer path aliases like `@/components/...` (configured in `tsconfig.json`).

## Testing Guidelines
- No test framework or coverage targets are configured yet.
- Until tests are added, rely on `pnpm lint` for automated checks. If you add tests, document the runner, naming pattern, and commands here.

## Commit & Pull Request Guidelines
- Use Conventional Commits as shown in history (e.g., `feat: add chess analysis panel`).
- PRs should include a concise summary, testing notes (`pnpm lint`, `pnpm build`), and linked issues.
- Include screenshots or short clips for UI changes.

## Configuration & Secrets
- Server actions in `src/app/actions.ts` require `REPLICATE_API_TOKEN` in `.env.local`.
- External analysis calls go to `https://chess-api.com/v1`; verify network access when debugging.
