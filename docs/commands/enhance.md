# flow enhance

Intelligently enhance database migrations with safety and performance improvements through an interactive two-phase process.

## Quick Start

```bash
# Enhance latest migration automatically
flow enhance

# Enhance specific migration file
flow enhance migrations/20240101000001_add_users.sql

# Preview changes without applying
flow enhance --dry-run

# Verbose output with detailed analysis
flow enhance --verbose
```

## Two-Phase Enhancement Process

Flow uses a carefully designed two-phase process that prioritizes safety over speed:

### 🛡️ Phase 1: Safety Enhancements

Critical safety improvements are applied first to ensure data integrity and prevent catastrophic failures:

- **Transaction Wrapper** - Wraps operations in BEGIN/COMMIT blocks
- **Drop Table Safeguards** - Adds IF EXISTS clauses and backup warnings
- **Backup Recommendations** - Suggests backups before destructive operations
- **Data Type Change Safety** - Validates risky type conversions
- **Cascade Delete Safety** - Warns about dangerous CASCADE operations
- **Column Renaming Safety** - Alerts about application compatibility issues
- **Unique Constraint Safety** - Validates constraint additions
- **Check Constraint Safety** - Ensures constraint requirements are met
- **Migration Order Safety** - Checks operation sequencing
- **Nullable Column Safety** - Ensures proper NULL handling

### ⚡ Phase 2: Speed Enhancements

Performance optimizations are applied after safety is ensured:

- **Smart Index Analysis** - Only suggests beneficial indexes
- **Concurrent Index Creation** - Non-blocking index operations
- **Batch Insert Optimization** - Combines multiple INSERT statements
- **Partial Index Suggestions** - Efficient selective indexing
- **Index Effectiveness Validation** - Prevents database bloat

## Smart Index Analysis

Flow's intelligent index analysis prevents common indexing mistakes:

### ✅ Suggests Indexes For:
- **Foreign key columns** (`user_id`, `*_id` patterns)
- **Common query columns** (`email`, `username`, `status`)
- **Unique constraint indexes** (automatically detected)
- **Timestamp columns** (`created_at`, `updated_at`)

### ❌ Warns Against:
- **Complex composite indexes** (>3 columns)
- **Text/blob column indexes** (inefficient for large text)
- **Redundant indexes** (already covered by other indexes)
- **Ineffective indexes** (won't improve query performance)

## Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `[file]` | Path to migration file (optional) | `migrations/add_index.sql` |
| `--dry-run` | Preview changes without applying | `--dry-run` |
| `--verbose, -v` | Enable detailed logging | `-v` |
| `--project, -p` | Specify project directory | `./backend` |
| `--env, -e` | Target environment | `--env production` |
| `--force` | Skip confirmations (dangerous) | `--force` |

## Example Enhancement Session

```bash
$ flow enhance
```

```
╭───────────────────────────────────────╮
│                                       │
│                 Flow                  │
│  Database Migration Enhancement Tool  │
│                                       │
╰───────────────────────────────────────╯

┌  Starting Flow Enhancement Process
●  ℹ️  Operating on latest migration: 20240101000001_add_users_table.sql
◇  ✅ Migration file loaded successfully

●  ━━━ Phase 1: Safety Enhancements ━━━
◇  ✅ Found 3 safety issue(s)

▲  ⚠️  Drop Table Safeguard
●     • Adds explicit confirmations for DROP TABLE operations
●      ⚠ DROP TABLE operation on table "old_users" - IRREVERSIBLE DATA LOSS
●      → Ensure you have a backup before proceeding

◇  Apply recommended safety enhancements? Yes
◇  ✅ Safety enhancements applied successfully

●  ━━━ Phase 2: Speed Enhancements ━━━
◇  ℹ️  Analyzing indexes for effectiveness...
◇  ✅ Found 2 beneficial index optimizations

◇  Apply speed enhancements? Yes
◇  ✅ Speed enhancements applied successfully

◆  ✅ ✨ Enhancement process completed successfully!
●     • Enhanced migration file: migrations/20240101000001_add_users_table.sql
└  Enhancement completed! 🎉
```

## Before & After Examples

### Index Enhancement Example

**❌ Before Enhancement:**
```sql
-- Blocking index creation
CREATE INDEX idx_user_email 
ON users (email);

-- No transaction safety
ALTER TABLE users 
ADD COLUMN status VARCHAR(50);
```

**✅ After Enhancement:**
```sql
-- Flow Enhancement: Transaction Wrapper
BEGIN;

-- Non-blocking concurrent index
CREATE INDEX CONCURRENTLY idx_user_email 
ON users (email);

-- Safe column addition
ALTER TABLE users 
ADD COLUMN status VARCHAR(50) DEFAULT 'active';

COMMIT;
```

### Safety Enhancement Example

**❌ Before Enhancement:**
```sql
-- Dangerous operation
DROP TABLE old_users;

-- No backup recommendation
TRUNCATE user_sessions;
```

**✅ After Enhancement:**
```sql
-- Flow Enhancement: Backup Safety
-- WARNING: Backup database before proceeding
-- This operation cannot be undone

-- Safe table drop with confirmation
DROP TABLE IF EXISTS old_users;

-- Flow Enhancement: Backup Recommendation  
-- Create backup before truncating data
TRUNCATE user_sessions;
```

## Integration Examples

### CI/CD Integration

```yaml
# GitHub Actions workflow
name: Database Migration Enhancement
on: [push, pull_request]

jobs:
  enhance-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Flow CLI
        run: npm install -g @driftjs/flow
      - name: Enhance Migrations
        run: flow enhance --dry-run
```

### Package.json Scripts

```json
// package.json
"scripts": {
  "db:enhance": "flow enhance",
  "db:enhance:dry": "flow enhance --dry-run",
  "db:validate": "flow validate",
  "db:status": "flow status"
}
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate migrations before commit
flow validate --all
flow enhance --dry-run
```

## Best Practices

### 🔄 Development Workflow
1. Write your migration file
2. Run `flow enhance --dry-run` to preview changes
3. Review the suggested enhancements
4. Run `flow enhance` to apply improvements
5. Test the enhanced migration in staging
6. Deploy to production with confidence

### ✅ Safety Guidelines
- Always create database backups before destructive operations
- Test enhanced migrations in staging environments first
- Review all safety warnings before proceeding
- Use `--dry-run` mode to preview changes
- Consider maintenance windows for blocking operations

### ⚡ Performance Tips
- Let Flow's smart analysis guide index decisions
- Use concurrent operations for large tables
- Batch similar operations together
- Consider partial indexes for large datasets
- Monitor index usage after deployment

## Related Commands

- [**flow validate**](./validate.md) - Validate migrations for potential issues
- [**flow plan**](./plan.md) - Preview enhancement changes without applying
- [**flow status**](./status.md) - Check enhancement status and statistics 