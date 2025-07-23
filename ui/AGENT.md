# UI Development Guide

## Frontend Commands

**Development server:**
```bash
cd ui && npm run dev
```
Server runs on `http://localhost:3000` with strict port requirement.

**Build and type checking:**
```bash
cd ui && npm run build
```
Runs TypeScript compilation followed by Vite build to `ui/build/` directory.

**Testing:**
```bash
cd ui && npm test          # Run tests
cd ui && npm run test:ui   # Run tests with UI
```
Uses Vitest with jsdom environment, globals enabled. No test files currently exist.

## Architecture

**Tech stack:**
- React 18 + TypeScript
- Vite for bundling and dev server
- Material-UI v6 with Docker theme (`@docker/docker-mui-theme`)
- MUI X Data Grid for container tables
- Docker Extension API (`@docker/extension-api-client`)

**Entry point:** `ui/src/main.tsx` → `App.tsx`

**State management:** React Context (`NgrokContext`) for global state

## Key Components

**Core layout:**
- `App.tsx` - Main app with conditional auth/container view
- `Header.tsx` - Top navigation with settings
- `AuthSetup.tsx` - Initial ngrok auth configuration
- `ErrorBanner.tsx` - Global error display

**Container management:**
- `ContainerGrid/ContainerGrid.tsx` - Main data grid with MUI X DataGrid
- `ContainerGrid/components/` - Grid cell components and UI elements
- `EndpointCreationDialog.tsx` - Multi-step endpoint creation wizard

**Context and state:**
- `NgrokContext.tsx` - Global state provider with Docker API integration
- `services/statusService.ts` - Polling service for agent status

## Component Organization

**File structure:**
```
ui/src/components/
├── NgrokContext.tsx           # Global state context
├── ContainerGrid/
│   ├── ContainerGrid.tsx      # Main data grid
│   ├── components/            # Grid-specific UI components
│   └── index.ts
├── [ComponentName].tsx        # Individual dialog/UI components
```

**Component patterns:**
- Use functional components with hooks
- Extract complex cell renderers to separate files in `ContainerGrid/components/`
- Dialog components handle their own state and API calls
- Use `useNgrokContext()` hook for accessing global state

## Docker Extension API Integration

**Client creation:**
```typescript
import { createDockerDesktopClient } from "@docker/extension-api-client";
const ddClient = createDockerDesktopClient();
```

**Backend communication:**
All API calls go through Docker Desktop client:
```typescript
const response = await ddClient.backend.get("/containers");
```

**Common API patterns:**
- `ddClient.backend.get/post/put/delete()` for backend calls
- `ddClient.docker.cli.exec()` for Docker CLI commands
- `ddClient.host.cli.exec()` for host system commands

## Material-UI Usage

**Theme setup:**
Use `DockerMuiV6ThemeProvider` wrapper in `main.tsx` for Docker Desktop styling.

**Common patterns:**
- `Grid2` for layouts (MUI v6 Grid)
- `DataGrid` from `@mui/x-data-grid` for tabular data
- `Dialog` components for modals/forms
- `Chip`, `IconButton`, `Tooltip` for interactive elements

**Styling:**
- Follow Docker Desktop design patterns
- Responsive with `Grid2` container/spacing system

## TypeScript Interfaces

**Core data types in `NgrokContext.tsx`:**
- `NgrokContainer` - Container with ngrok-specific data
- `DockerContainer` - Raw Docker container data
- `EndpointConfiguration` - Stored endpoint settings
- `RunningEndpoint` - Active ngrok tunnel data
- `AgentStatus` - ngrok agent connection status

**Props typing:**
Type all component props explicitly. Use `interface` for complex props, `type` for simple ones.

## Development Workflow

**Local development:**
1. Start backend: `make dev` (from project root)
2. Start UI dev server: `cd ui && npm run dev`
3. Extension loads in Docker Desktop at `localhost:3000`

**Making changes:**
1. Edit TypeScript/React files in `ui/src/`
2. Vite hot-reloads automatically
3. TypeScript errors show in terminal and browser
4. Build with `npm run build` before testing production

**Component development:**
1. Add new components to `ui/src/components/`
2. Export from component file, import in parent
3. Use existing patterns for Docker API integration
4. Follow Material-UI component patterns

## Testing Strategy

**Setup:** Vitest configured with jsdom environment, React Testing Library patterns expected.