# 🌊 Flow - Intelligent Database Migration Tool

**Flow** is an advanced database migration enhancement tool that automatically detects potential issues and optimizes your SQL migrations for safety and performance.

## 🚀 Quick Start

```bash
# Initialize Flow in your project
flow init

# Enhance your latest migration
flow enhance

# Validate migration safety
flow validate

# Generate execution plan
flow plan

# Test rollback capability
flow rollback
```

## 🎯 Core Features

### 🛡️ **Safety Enhancements**
- **Transaction Wrapping**: Automatically wraps migrations in transactions
- **Drop Table Safeguards**: Adds safety checks for destructive operations
- **Backup Recommendations**: Suggests backups before risky operations
- **Constraint Validation**: Verifies data compatibility before adding constraints
- **Cascade Delete Warnings**: Alerts about potential data loss from cascading deletes
- **Data Type Change Safety**: Validates type conversions and suggests safer approaches
- **Column Renaming Safeguards**: Warns about application compatibility issues
- **Nullable Column Safety**: Ensures proper NULL handling in column modifications
- **Migration Order Validation**: Checks for correct operation sequencing

### ⚡ **Speed Enhancements**
- **Concurrent Index Creation**: Adds CONCURRENTLY option for PostgreSQL indexes
- **Batch Insert Optimization**: Converts multiple INSERTs into efficient batch operations
- **Index Optimization**: Suggests composite and covering indexes
- **Partial Index Recommendations**: Suggests selective indexing for better performance
- **Query Optimization Tips**: Provides performance improvement suggestions

## 📋 Commands

### Main Commands
- `flow enhance [file]` - Interactive enhancement of migrations (safety → speed)
- `flow validate [file]` - Validate migration safety and performance
- `flow plan [file]` - Generate and preview execution plan
- `flow rollback [file]` - Test and generate rollback procedures

### Management Commands
- `flow init` - Initialize Flow in your project
- `flow config` - Configure Flow settings
- `flow status` - View migration and enhancement status

> **Note**: All action commands automatically operate on the latest migration file if no file is specified.

## 🔧 Configuration

Create a `flow.config.json` file in your project root:

```json
{
  "defaultEnvironment": "development",
  "environments": {
    "development": {
      "migrationsPath": "./migrations",
      "databaseType": "postgresql"
    },
    "production": {
      "migrationsPath": "./migrations",
      "databaseType": "postgresql"
    }
  },
  "enhancements": {
    "enableSafetyEnhancements": true,
    "enableSpeedEnhancements": true,
    "defaultConfirmSafety": true,
    "defaultConfirmSpeed": false,
    "disabledEnhancements": [],
    "customPriorities": {}
  }
}
```

### Configuration Options

#### Environment Settings
- `migrationsPath`: Path to your migration files
- `databaseType`: Database type (`postgresql`, `mysql`, `sqlite`, `sqlserver`)
- `databaseUrl`: Connection string (optional)

#### Enhancement Settings
- `enableSafetyEnhancements`: Enable/disable safety enhancements
- `enableSpeedEnhancements`: Enable/disable speed enhancements
- `defaultConfirmSafety`: Require confirmation for safety enhancements
- `defaultConfirmSpeed`: Require confirmation for speed enhancements
- `disabledEnhancements`: Array of enhancement IDs to disable
- `customPriorities`: Override default enhancement priorities

## 🎨 Interactive Enhancement Flow

The `flow enhance` command provides a guided, interactive experience:

### Phase 1: Safety Enhancements
1. **Detection**: Scans migration for potential safety issues
2. **Analysis**: Explains each issue and impact
3. **Confirmation**: "Do you want to apply recommended safety enhancements?" (default: Yes)
4. **Application**: Applies selected safety improvements

### Phase 2: Speed Enhancements  
1. **Detection**: Identifies performance optimization opportunities
2. **Analysis**: Shows potential performance improvements
3. **Confirmation**: "Do you want to apply recommended speed enhancements?" (default: No)
4. **Application**: Applies selected performance optimizations

## 📖 Enhancement Types

### Safety Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Backup Recommendation** | Suggests database backups before risky operations | 🔴 Critical (9) |
| **Cascade Delete Safety** | Warns about CASCADE DELETE risks | 🔴 Critical (9) |
| **Data Type Change Safety** | Validates risky type conversions | 🟠 High (8) |
| **Migration Order Safety** | Checks operation sequencing | 🟠 High (8) |
| **Transaction Wrapper** | Wraps migrations in transactions | 🟠 High (8) |
| **Column Renaming Safety** | Warns about compatibility issues | 🟡 Medium (7) |
| **Unique Constraint Safety** | Validates constraint additions | 🟡 Medium (7) |
| **Drop Table Safeguard** | Adds IF EXISTS and warnings | 🟡 Medium (6) |
| **Check Constraint Safety** | Validates constraint requirements | 🟡 Medium (6) |
| **Nullable Column Safety** | Ensures proper NULL handling | 🟡 Medium (6) |

### Speed Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Index Optimization** | Suggests composite/covering indexes | ⚡ High (8) |
| **Batch Insert Optimization** | Converts to batch operations | ⚡ Medium (7) |
| **Concurrent Index** | Adds CONCURRENTLY for PostgreSQL | ⚡ Medium (6) |
| **Partial Index** | Suggests selective indexing | ⚡ Medium (6) |

## 🔍 Example Enhancement

### Before Enhancement
```sql
CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255));
DROP TABLE old_users;
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
CREATE INDEX idx_users_email ON users (email);
```

### After Enhancement
```sql
-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION
-- This migration contains potentially destructive operations.
-- It is STRONGLY recommended to create a full database backup before proceeding.
-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
--

BEGIN;

CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255));

-- DROP TABLE safety check
-- Verify table can be safely dropped
-- Check for: foreign key references, dependent views, active connections
DROP TABLE IF EXISTS old_users;

-- UNIQUE CONSTRAINT WARNING:
-- Ensure no duplicate values exist before adding unique constraint:
-- SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Index optimization suggestions:
-- 1. Consider composite indexes for related columns: (col1, col2)
-- 2. Use covering indexes to include frequently selected columns
-- 3. Order columns by selectivity (most selective first)
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

COMMIT;
```

## 🚀 Installation

```bash
# Install globally
npm install -g @driftjs/flow

# Or use in project
npm install --save-dev @driftjs/flow
npx flow init
```

## 🔄 Workflow Integration

### With Drizzle ORM
```bash
# Generate migration
drizzle-kit generate

# Enhance the migration
flow enhance

# Apply enhanced migration
drizzle-kit migrate
```

### With Prisma
```bash
# Generate migration
prisma migrate dev --create-only

# Enhance the migration
flow enhance

# Apply enhanced migration
prisma migrate dev
```

### CI/CD Integration
```yaml
- name: Validate Migrations
  run: |
    flow validate
    flow plan --dry-run
```

## 🎯 Best Practices

1. **Always enhance migrations** before applying to production
2. **Review enhancement suggestions** carefully
3. **Test rollback procedures** with `flow rollback`
4. **Use staging environments** to validate enhanced migrations
5. **Keep backups** before applying destructive operations

## 🤝 Contributing

Flow is built with a modular enhancement system. Each enhancement is a separate module with:

- **Detector**: Identifies when enhancement applies
- **Analyzer**: Analyzes impact and provides details
- **Applicator**: Applies the enhancement to migration content

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on adding new enhancements.

## 📄 License

MIT © DriftJS Team

---

**🌊 Make your database migrations flow smoothly with enhanced safety and performance!**