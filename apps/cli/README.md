# DriftJS Flow

🌊 **DriftJS Flow** is an enhanced, production-safety-first database migration CLI that adds guard-rails and developer-friendly UX on top of modern ORMs (Drizzle, Prisma, TypeORM, etc.).

Key features
-------------

• ⚡ **Zero-friction setup** – `bun add -g @driftjs/flow` or `bunx @driftjs/flow init` inside any project.<br>
• 🔐 **Safety checks** – prevents destructive operations (accidental drops, long-running locks) before they reach production.
• 🛠️ **Framework-agnostic** – works with any SQL-based ORM or raw migration workflow.
• 🏝️ **Smooth developer experience** – interactive prompts, progress spinners and colourised output powered by `@clack/prompts`.

Installation
------------

```bash
# Global – recommended for everyday usage
bun add -g @driftjs/flow    # flow init

# Local (workspace / dev dependency)
bun add -D @driftjs/flow    # bun run flow init (init adds the script automatically!)
```

Quick start
-----------

```bash
# 1. Initialise configuration
a) Global binary
   flow init

b) One-off with bunx
   bunx @driftjs/flow init

# 2. Inspect generated flow.config.json and customise if needed

# 3. Run migrations
bun run flow sync   # detect & generate safe migration plan
bun run flow apply  # execute plan
```

Commands
--------

| Command | Description |
|---------|-------------|
| `flow init`  | Create or update `flow.config.json` in the current project, plus a handy `flow` script in *package.json*. |
| `flow sync`  | Analyse your ORM schema vs database, create migration plan with safety checks. |
| `flow apply` | Execute the plan against target environment. |
| `flow back`  | Roll back the latest batch safely. |

Contributing & local development
--------------------------------

This package lives in the `apps/cli` workspace of the **driftjs** mono-repo. To hack on it locally:

```bash
git clone https://github.com/your-org/driftjs.git
cd driftjs
bun i

# build in watch-mode
cd apps/cli
bun run dev

# run Jest tests
bun test
```

License
-------

MIT © DriftJS Team 