# 🔧 Flow Enhancement Guide

This guide provides detailed documentation for all enhancement types available in Flow, including examples, use cases, and configuration options.

## 🛡️ Safety Enhancements

Safety enhancements focus on preventing data loss, avoiding migration failures, and ensuring database integrity.

### 1. Backup Recommendation (Priority: 9 - Critical)

**Purpose**: Suggests creating database backups before executing potentially destructive operations.

**Detects**:
- `DROP TABLE` statements
- `DROP COLUMN` operations
- `TRUNCATE` statements
- `DELETE FROM` with no WHERE clause
- `UPDATE` statements that could affect large datasets

**Example Enhancement**:
```sql
-- Original
DROP TABLE old_users;

-- Enhanced
-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION
-- This migration contains potentially destructive operations.
-- It is STRONGLY recommended to create a full database backup before proceeding.
-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
--

DROP TABLE old_users;
```

**Configuration**:
```json
{
  "enhancements": {
    "customPriorities": {
      "safety-backup-recommendation": 9
    }
  }
}
```

### 2. Cascade Delete Safety (Priority: 9 - Critical)

**Purpose**: Warns about CASCADE DELETE operations that can cause unintended data loss across related tables.

**Detects**:
- `ON DELETE CASCADE` constraints
- `CASCADE DELETE` operations

**Example Enhancement**:
```sql
-- Original
ALTER TABLE posts ADD CONSTRAINT fk_posts_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Enhanced
-- ⚠️  CASCADE DELETE WARNING:
-- This will automatically delete related records in child tables.
-- Consider safer alternatives:
-- 1. ON DELETE RESTRICT (prevents deletion if child records exist)
-- 2. ON DELETE SET NULL (sets foreign key to NULL)
-- 3. Application-level cleanup logic
ALTER TABLE posts ADD CONSTRAINT fk_posts_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### 3. Data Type Change Safety (Priority: 8 - High)

**Purpose**: Detects risky data type conversions and suggests safer migration patterns.

**Detects**:
- Type conversions that may cause data loss (VARCHAR to INT, DECIMAL to INT)
- Timestamp to date conversions
- Large text fields to smaller varchar fields

**Example Enhancement**:
```sql
-- Original
ALTER COLUMN status TYPE INTEGER;

-- Enhanced
-- Safety check: Verify data compatibility before type conversion
-- Consider backing up data or using a staged migration approach
ALTER COLUMN status TYPE INTEGER;
```

**Risky Conversions Detected**:
- `VARCHAR` → `INT`: May fail if non-numeric data exists
- `TEXT` → `VARCHAR(n)`: May truncate longer text
- `DECIMAL` → `INT`: Loses decimal precision
- `TIMESTAMP` → `DATE`: Loses time information

### 4. Migration Order Safety (Priority: 8 - High)

**Purpose**: Checks for potential issues with the order of operations in migrations.

**Detects**:
- INSERT statements before CREATE TABLE
- Operations that depend on previously created structures
- Dependencies between schema changes

**Example Enhancement**:
```sql
-- Original (problematic order)
INSERT INTO users (name) VALUES ('John');
CREATE TABLE users (id SERIAL, name VARCHAR(100));

-- Enhanced
-- MIGRATION ORDER GUIDELINES:
-- 1. CREATE statements (tables, indexes) first
-- 2. ALTER statements (modify existing structures)
-- 3. INSERT/UPDATE statements (data operations)
-- 4. DROP statements (remove structures) last
--

CREATE TABLE users (id SERIAL, name VARCHAR(100));
INSERT INTO users (name) VALUES ('John');
```

### 5. Transaction Wrapper (Priority: 8 - High)

**Purpose**: Wraps migration operations in database transactions for atomicity.

**Detects**:
- Migrations without explicit transaction boundaries
- Multiple DDL operations that should be atomic

**Example Enhancement**:
```sql
-- Original
CREATE TABLE users (id SERIAL PRIMARY KEY);
ALTER TABLE users ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_users_email ON users (email);

-- Enhanced
-- Transaction wrapper for atomic migration execution
-- Ensures all-or-nothing execution
BEGIN;

CREATE TABLE users (id SERIAL PRIMARY KEY);
ALTER TABLE users ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_users_email ON users (email);

COMMIT;
```

### 6. Column Renaming Safety (Priority: 7 - Medium)

**Purpose**: Warns about application compatibility risks when renaming database columns.

**Detects**:
- `RENAME COLUMN` operations
- `ALTER COLUMN ... RENAME TO` statements

**Example Enhancement**:
```sql
-- Original
ALTER TABLE users RENAME COLUMN name TO full_name;

-- Enhanced
-- ⚠️  COLUMN RENAME WARNING:
-- This operation can break existing application code.
-- Recommended staged approach:
-- 1. Add new column with desired name
-- 2. Copy data from old to new column
-- 3. Update application code to use new column
-- 4. Drop old column in a separate migration
ALTER TABLE users RENAME COLUMN name TO full_name;
```

### 7. Unique Constraint Safety (Priority: 7 - Medium)

**Purpose**: Warns about potential issues when adding unique constraints to existing tables with data.

**Detects**:
- `ADD UNIQUE` constraints
- `CREATE UNIQUE INDEX` statements

**Example Enhancement**:
```sql
-- Original
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Enhanced
-- UNIQUE CONSTRAINT WARNING:
-- Ensure no duplicate values exist before adding unique constraint:
-- SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
```

### 8. Drop Table Safeguard (Priority: 6 - Medium)

**Purpose**: Adds safety checks for DROP TABLE operations to prevent accidental data loss.

**Detects**:
- `DROP TABLE` statements without `IF EXISTS`
- Potentially destructive table removal operations

**Example Enhancement**:
```sql
-- Original
DROP TABLE old_users;

-- Enhanced
-- DROP TABLE safety check
-- Verify table can be safely dropped
-- Check for: foreign key references, dependent views, active connections
DROP TABLE IF EXISTS old_users;
```

### 9. Check Constraint Safety (Priority: 6 - Medium)

**Purpose**: Warns about potential issues when adding check constraints to existing tables.

**Detects**:
- `ADD CONSTRAINT ... CHECK` statements
- Check constraint additions to populated tables

**Example Enhancement**:
```sql
-- Original
ALTER TABLE users ADD CONSTRAINT users_age_check CHECK (age >= 0);

-- Enhanced
-- CHECK CONSTRAINT WARNING:
-- Verify existing data meets constraint requirements:
-- SELECT * FROM users WHERE NOT (age >= 0);
ALTER TABLE users ADD CONSTRAINT users_age_check CHECK (age >= 0);
```

### 10. Nullable Column Safety (Priority: 6 - Medium)

**Purpose**: Ensures safe handling of nullable column operations by adding proper NULL checks and default values.

**Detects**:
- `ALTER COLUMN ... SET NOT NULL` without defaults
- `ALTER COLUMN ... DROP NOT NULL` operations

**Example Enhancement**:
```sql
-- Original
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Enhanced
-- Safety check: Ensure no NULL values exist before adding NOT NULL constraint
-- UPDATE users SET email = 'default@example.com' WHERE email IS NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

## ⚡ Speed Enhancements

Speed enhancements focus on improving migration performance and optimizing database operations.

### 1. Index Optimization (Priority: 8 - High)

**Purpose**: Analyzes indexes and suggests optimizations like composite indexes, covering indexes, and proper ordering.

**Detects**:
- Multiple single-column indexes that could be combined
- Missing covering index opportunities
- Suboptimal index column ordering

**Example Enhancement**:
```sql
-- Original
CREATE INDEX idx_users_name ON users (name);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);

-- Enhanced
-- Index optimization suggestions:
-- 1. Consider composite indexes for related columns: (col1, col2)
-- 2. Use covering indexes to include frequently selected columns
-- 3. Order columns by selectivity (most selective first)
CREATE INDEX idx_users_name ON users (name);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);
```

### 2. Batch Insert Optimization (Priority: 7 - Medium)

**Purpose**: Converts multiple INSERT statements into efficient batch INSERT operations.

**Detects**:
- 4+ individual INSERT statements for the same table
- Separate INSERT operations that can be batched

**Example Enhancement**:
```sql
-- Original
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
INSERT INTO users (name, email) VALUES ('Jane', 'jane@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');

-- Enhanced
-- Optimized batch insert for users
INSERT INTO users (name, email) VALUES
  ('John', 'john@example.com'),
  ('Jane', 'jane@example.com'),
  ('Bob', 'bob@example.com');
```

### 3. Concurrent Index Creation (Priority: 6 - Medium)

**Purpose**: Adds CONCURRENTLY option to CREATE INDEX statements for PostgreSQL to avoid table locks.

**Detects**:
- `CREATE INDEX` statements without `CONCURRENTLY`
- PostgreSQL database type in configuration

**Example Enhancement**:
```sql
-- Original
CREATE INDEX idx_users_email ON users (email);

-- Enhanced
-- Using CONCURRENTLY to avoid table locks during index creation
-- Note: This prevents the index creation from blocking other operations
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

**Benefits**:
- Prevents table locks during index creation
- Allows concurrent reads and writes
- Safer for production environments

### 4. Partial Index Recommendations (Priority: 6 - Medium)

**Purpose**: Suggests using partial indexes for columns with selective conditions to improve query performance.

**Detects**:
- Indexes on boolean columns
- Indexes on status/enum columns
- Opportunities for WHERE clauses in indexes

**Example Enhancement**:
```sql
-- Original
CREATE INDEX idx_users_status ON users (status);

-- Enhanced
-- Consider partial index for selective filtering
CREATE INDEX idx_users_status ON users (status);
-- Consider partial index: CREATE INDEX idx_users_status ON users (status) WHERE active = true;
```

**Benefits**:
- Smaller index size
- Faster index scans for filtered queries
- Reduced storage requirements

## 🎛️ Enhancement Configuration

### Disabling Specific Enhancements

```json
{
  "enhancements": {
    "disabledEnhancements": [
      "safety-transaction-wrapper",
      "speed-concurrent-index"
    ]
  }
}
```

### Custom Priorities

```json
{
  "enhancements": {
    "customPriorities": {
      "safety-backup-recommendation": 10,
      "speed-batch-insert": 8
    }
  }
}
```

### Environment-Specific Settings

```json
{
  "environments": {
    "production": {
      "customEnhancements": {
        "enableSpeedEnhancements": false,
        "defaultConfirmSafety": true
      }
    },
    "development": {
      "customEnhancements": {
        "enableSpeedEnhancements": true,
        "defaultConfirmSafety": false
      }
    }
  }
}
```

## 🔍 Enhancement Impact Analysis

Each enhancement provides detailed impact analysis:

### Risk Reduction (0-1)
- **0.9**: Critical safety improvements (backup recommendations, cascade warnings)
- **0.7**: High safety improvements (constraint validation, type safety)
- **0.5**: Medium safety improvements (order validation, nullable checks)

### Performance Improvement (0-1)
- **0.8**: High performance gains (index optimization, query improvements)
- **0.7**: Medium performance gains (batch operations, concurrent operations)
- **0.5**: Low performance gains (minor optimizations)

### Complexity Added (0-1)
- **0.1**: Minimal complexity (comments, warnings)
- **0.3**: Low complexity (simple modifications)
- **0.5**: Medium complexity (structural changes)

## 🚀 Creating Custom Enhancements

Flow's modular architecture allows you to create custom enhancements:

```typescript
// custom-enhancement.ts
import { Enhancement, EnhancementModule } from '@driftjs/flow';

const customEnhancement: Enhancement = {
  id: 'custom-my-enhancement',
  name: 'My Custom Enhancement',
  description: 'Description of what this enhancement does',
  category: 'safety', // or 'speed'
  priority: 5,
  requiresConfirmation: true,
  tags: ['custom', 'safety']
};

class CustomDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    // Detection logic
    return migration.up.includes('CUSTOM_PATTERN');
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    // Analysis logic
    return {
      applicable: true,
      confidence: 0.8,
      issues: [],
      impact: {
        riskReduction: 0.6,
        performanceImprovement: 0,
        complexityAdded: 0.2,
        description: 'Custom enhancement impact'
      }
    };
  }
}

class CustomApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    // Application logic
    const modifiedContent = content.replace('PATTERN', 'ENHANCED_PATTERN');
    
    return {
      enhancement: customEnhancement,
      applied: true,
      modifiedContent,
      warnings: [],
      changes: [{
        type: 'MODIFIED',
        original: 'PATTERN',
        modified: 'ENHANCED_PATTERN',
        line: 1,
        reason: 'Applied custom enhancement'
      }]
    };
  }
}

export const customEnhancementModule: EnhancementModule = {
  enhancement: customEnhancement,
  detector: new CustomDetector(),
  applicator: new CustomApplicator()
};
```

---

**🌊 This comprehensive enhancement system ensures your database migrations are both safe and performant!** 