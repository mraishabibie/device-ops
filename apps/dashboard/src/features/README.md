# Feature-Based Architecture

To keep the codebase maintainable and scalable, the dashboard utilizes a feature-based architecture. All code associated with a specific business domain is self-contained in a feature folder inside `src/features/<feature-name>/`.

## Feature Folder Structure

Each feature folder is structured as follows:

```
src/features/<feature-name>/
├── components/   # UI components specific to this feature
├── hooks/        # React hooks specific to this feature
├── services/     # API service clients and integration functions
└── types/        # Type definitions and interfaces
```

## Standard Business Features (MVP)

1. **auth**: Login, Logout, token refreshing, session validation.
2. **dashboard**: Total/Online/Offline device statistics overview, Live map widget.
3. **devices**: Device lists, details, pairing wizard, historical telemetry log display.
4. **settings**: Workspace settings, company profile configuration.
5. **users**: User list, creating/editing users, disabling user access.

## Global Components

Shared UI controls that are reused across multiple business domains (like standard buttons, dialogs, form inputs, headers, sidebar layouts) belong in the global directories:
* `src/components/ui/` - shadcn/ui components (button, input, card, etc.)
* `src/components/common/` - custom global layouts, headers, sidebars, loaders
* `src/lib/` - utilities, shared configuration configs
