# flow rollback

Generate rollback scripts to safely undo migrations and their enhancements. Provides comprehensive recovery strategies for emergency situations.

## Quick Start

```bash
# Generate rollback script for latest migration
flow rollback

# Generate rollback for specific migration
flow rollback migrations/20240101000001_add_users.sql

# Generate rollback with detailed recovery instructions
flow rollback --verbose

# Generate rollback for different project
flow rollback --project ./backend
```

## Overview

The `flow rollback` command creates comprehensive **rollback scripts** and **recovery procedures** for your enhanced migrations. It's essential for:

- **Emergency recovery** when migrations fail in production
- **Testing rollback procedures** before deployment
- **Compliance requirements** for change management
- **Development workflow** to undo local changes safely

## How Rollback Works

```mermaid
graph TD
    A[Enhanced Migration] --> B[Analyze Operations]
    B --> C[Generate Reverse Operations]
    C --> D[Create Safety Checks]
    D --> E[Add Recovery Instructions]
    E --> F[Complete Rollback Script]
    
    G[Data Backup Tables] --> H[Recovery Procedures]
    H --> F
```

Flow generates rollback scripts by:
1. **Analyzing** each operation in the enhanced migration
2. **Reversing** operations in correct dependency order
3. **Including** safety checks and data validation
4. **Providing** recovery procedures for backed-up data
5. **Adding** detailed instructions for manual steps

## Command Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `[file]` | - | Migration file to rollback (optional) | `20240101_add_users.sql` |
| `--project` | `-p` | Specify project directory | `--project ./backend` |
| `--verbose` | `-v` | Include detailed instructions | `--verbose` |
| `--output` | `-o` | Save rollback script to file | `--output rollback.sql` |
| `--include-data` | - | Include data recovery procedures | `--include-data` |
| `--dry-run` | - | Preview rollback without saving | `--dry-run` |

## Example Rollback Session

```bash
$ flow rollback migrations/20240101_add_users.sql
```

```
╭─────────────────────────────────╮
│               Flow              │
│    Rollback Script Generator    │
╰─────────────────────────────────╯

┌  Generating Rollback Script
●  📁 Analyzing: 20240101_add_users.sql
◇  ✅ Enhanced migration loaded successfully

●  🔍 Analyzing operations for rollback...
◇  ✅ Found 5 operations to reverse

●  🛡️ Including safety checks...
◇  ✅ Safety validations added

●  💾 Including data recovery procedures...
◇  ✅ Backup recovery instructions added

●  📝 Generating comprehensive rollback script...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 ROLLBACK SCRIPT FOR: 20240101_add_users.sql

-- ========================================
-- EMERGENCY ROLLBACK SCRIPT
-- Generated: 2024-01-01 12:00:00 UTC
-- Original Migration: 20240101_add_users.sql
-- ========================================

-- IMPORTANT: READ BEFORE EXECUTING
-- 1. This script reverses all operations from the migration
-- 2. Data may be lost - ensure you have backups
-- 3. Test in staging environment first
-- 4. Some operations cannot be fully reversed

-- ========================================
-- PRE-ROLLBACK SAFETY CHECKS
-- ========================================

DO $$
BEGIN
    -- Check if tables exist before rollback
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Table users does not exist - migration may not have been applied';
    END IF;
    
    -- Verify data integrity before rollback
    PERFORM 1 FROM users LIMIT 1;
    RAISE NOTICE 'Found % rows in users table', (SELECT count(*) FROM users);
END $$;

-- ========================================
-- ROLLBACK OPERATIONS (REVERSE ORDER)
-- ========================================

BEGIN;

-- Step 5: Drop added indexes (reverse of Flow enhancement)
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_id;

-- Step 4: Remove NOT NULL constraint (reverse of safe NOT NULL addition)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Step 3: Drop added column
ALTER TABLE users DROP COLUMN IF EXISTS email;

-- Step 2: Restore backed up data (if backup tables exist)
-- WARNING: This will restore old_users table from backup
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'old_users_backup') THEN
        DROP TABLE IF EXISTS old_users;
        ALTER TABLE old_users_backup RENAME TO old_users;
        RAISE NOTICE 'Restored old_users table from backup';
    ELSE
        RAISE WARNING 'Backup table old_users_backup not found - data cannot be restored';
    END IF;
END $$;

-- Step 1: Remove any Flow enhancement comments and metadata
-- (No action needed - comments are informational)

COMMIT;

-- ========================================
-- POST-ROLLBACK VERIFICATION
-- ========================================

DO $$
BEGIN
    -- Verify rollback completed successfully
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'email') THEN
        RAISE WARNING 'Column users.email still exists after rollback';
    ELSE
        RAISE NOTICE 'Rollback verification: users.email column removed successfully';
    END IF;
    
    -- Check for orphaned indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        RAISE WARNING 'Index idx_users_email still exists after rollback';
    END IF;
END $$;

-- ========================================
-- MANUAL RECOVERY STEPS (IF NEEDED)
-- ========================================

/*
Manual steps that may be required:

1. Application Configuration:
   - Update application code to remove email field references
   - Remove email validation logic
   - Update API documentation

2. Data Recovery:
   - If old_users_backup table wasn't found, restore from external backup:
     psql -d mydb < backup_old_users_20240101.sql

3. Performance:
   - Run ANALYZE on affected tables to update statistics:
     ANALYZE users;
     ANALYZE orders;

4. Monitoring:
   - Check application logs for errors after rollback
   - Monitor database performance for unexpected issues
   - Verify all application features work correctly

5. Cleanup:
   - Remove any temporary backup files
   - Update migration tracking if using custom tools
*/

-- ========================================
-- ROLLBACK SCRIPT COMPLETE
-- ========================================

◆  ✅ Rollback script generated successfully!

💾 Script saved to: rollback_20240101_add_users.sql

⚠️  IMPORTANT REMINDERS:
• Test this rollback script in staging first
• Ensure you have database backups before running
• Some operations may not be fully reversible
• Manual application changes may be required

└  Rollback generation completed! 🔄
```

## Rollback Script Structure

### 1. Safety Checks
```sql
-- Verify migration was actually applied
-- Check data integrity before rollback  
-- Validate dependencies
```

### 2. Reverse Operations
```sql
-- Drop indexes (CONCURRENTLY for safety)
-- Remove constraints
-- Drop columns
-- Restore backed up data
-- Undo schema changes
```

### 3. Verification
```sql
-- Confirm rollback success
-- Check for orphaned objects
-- Validate data consistency
```

### 4. Manual Instructions
```sql
-- Application code changes needed
-- External backup restoration steps  
-- Performance optimization tasks
-- Monitoring checkpoints
```

## Integration Examples

### Emergency Rollback Procedure

```bash
#!/bin/bash
# emergency-rollback.sh

set -e

MIGRATION_FILE=$1
if [ -z "$MIGRATION_FILE" ]; then
    echo "Usage: $0 <migration-file>"
    exit 1
fi

echo "🚨 EMERGENCY ROLLBACK PROCEDURE"
echo "Migration: $MIGRATION_FILE"
echo "Time: $(date)"

# Generate rollback script
echo "📝 Generating rollback script..."
flow rollback "$MIGRATION_FILE" --output "emergency_rollback.sql" --verbose

# Backup current state before rollback
echo "💾 Creating emergency backup..."
pg_dump $DATABASE_URL > "emergency_backup_$(date +%Y%m%d_%H%M%S).sql"

# Confirm with operator
echo "⚠️  Ready to execute rollback. Continue? (yes/no)"
read -r response
if [ "$response" != "yes" ]; then
    echo "Rollback cancelled"
    exit 1
fi

# Execute rollback
echo "🔄 Executing rollback..."
psql $DATABASE_URL < emergency_rollback.sql

echo "✅ Emergency rollback completed"
echo "📋 Check application functionality and monitor logs"
```

### CI/CD Integration

```yaml
# GitHub Actions - Test Rollback Procedures
name: Test Migration Rollback
on: [pull_request]

jobs:
  test-rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Database
        run: |
          docker run -d --name test-db -e POSTGRES_PASSWORD=test postgres:15
          sleep 10
      - name: Install Flow CLI  
        run: npm install -g @driftjs/flow
      - name: Apply Migration
        run: |
          flow enhance migrations/latest.sql
          psql postgresql://postgres:test@localhost:5432/postgres < migrations/latest.sql
      - name: Generate and Test Rollback
        run: |
          flow rollback migrations/latest.sql --output rollback.sql
          # Test rollback in transaction (auto-rollback)
          psql postgresql://postgres:test@localhost:5432/postgres -c "BEGIN; \i rollback.sql; ROLLBACK;"
          echo "✅ Rollback script tested successfully"
```

### Package.json Scripts

```json
{
  "scripts": {
    "db:rollback": "flow rollback",
    "db:rollback:latest": "flow rollback --verbose --output latest_rollback.sql",
    "db:emergency": "./scripts/emergency-rollback.sh"
  }
}
```

## Advanced Rollback Scenarios

### Complex Data Migration Rollback

For migrations that transform data:

```sql
-- Original Migration (simplified)
UPDATE users SET status = 
  CASE 
    WHEN last_login > NOW() - INTERVAL '30 days' THEN 'active'
    ELSE 'inactive' 
  END;

-- Generated Rollback
-- Flow Enhancement: Data Recovery from Backup
INSERT INTO users (id, status, last_login)
SELECT id, original_status, last_login 
FROM users_status_backup 
ON CONFLICT (id) DO UPDATE SET 
  status = EXCLUDED.status;

DROP TABLE users_status_backup;
```

### Multi-Table Constraint Rollback

For complex foreign key relationships:

```sql
-- Rollback removes constraints in dependency order
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_customer;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_items_order;

-- Then removes tables/columns
ALTER TABLE customers DROP COLUMN IF EXISTS customer_type;
```

## Best Practices

### 🚨 Emergency Preparedness
- **Generate rollback scripts** for every production migration
- **Test rollback procedures** in staging environments
- **Store rollback scripts** with deployment artifacts
- **Document manual steps** required for complete rollback

### ✅ Safety Guidelines
- **Always backup** before running rollback scripts
- **Test in staging** before production rollback
- **Coordinate with team** before emergency rollbacks
- **Monitor applications** after rollback completion

### 🔄 Development Workflow
1. **Generate rollback** after creating migration
2. **Review rollback script** to understand impact
3. **Test rollback locally** to verify it works
4. **Include rollback** in deployment documentation
5. **Store rollback** for emergency access

## Limitations and Considerations

### Operations That Cannot Be Rolled Back
- **Data destruction** without backups (DROP TABLE, TRUNCATE)
- **Irreversible type conversions** (e.g., text to integer with data loss)
- **Sequence resets** may not restore exact values
- **Large data operations** may require significant time

### Operations Requiring Manual Steps
- **Application code changes** 
- **External system integrations**
- **API contract changes**
- **User permission updates**

## Related Commands

- [**flow enhance**](./enhance.md) - Create the enhanced migration to rollback
- [**flow plan**](./plan.md) - Preview enhancements before applying
- [**flow status**](./status.md) - Check current migration state

## Configuration

Rollback behavior can be customized in `flow.config.json`:

```json
{
  "rollback": {
    "includeDataRecovery": true,
    "verboseInstructions": true,
    "safetyChecks": true,
    "backupTablePrefix": "backup_",
    "generateVerification": true,
    "includeManualSteps": true
  },
  "safety": {
    "requireBackupBeforeRollback": true,
    "rollbackTestingRequired": true
  }
}
```

---

**⚠️ Critical Reminder**: Rollback scripts are for emergency use. Always test in staging and have verified backups before using in production. Some operations cannot be fully reversed - prevention is better than cure! 