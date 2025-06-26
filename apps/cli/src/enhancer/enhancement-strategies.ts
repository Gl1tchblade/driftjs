/**
 * Comprehensive Migration Enhancement Strategies
 * 50+ different ways to improve migration safety, performance, and reliability
 */

import { MigrationStep } from './strategy-generator.js'

export interface EnhancementRule {
  id: string
  name: string
  description: string
  category: 'SAFETY' | 'PERFORMANCE' | 'RELIABILITY' | 'ROLLBACK' | 'VALIDATION' | 'MONITORING'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  applies: (sql: string) => boolean
  enhance: (sql: string, context?: any) => MigrationStep[]
  example: {
    before: string
    after: string
    explanation: string
  }
}

export const ENHANCEMENT_RULES: EnhancementRule[] = [
  // SAFETY ENHANCEMENTS (1-15)
  {
    id: 'safe-not-null-addition',
    name: 'Safe NOT NULL Column Addition',
    description: 'Add columns as nullable first, populate with defaults, then apply NOT NULL constraint',
    category: 'SAFETY',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('add column') && sql.toLowerCase().includes('not null') && !sql.toLowerCase().includes('default'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/alter\s+table\s+(\w+)/i)
      const columnMatch = sql.match(/add\s+column\s+(\w+)\s+([^,\s]+)/i)
      if (!tableMatch || !columnMatch) return []
      
      const [, tableName] = tableMatch
      const [, columnName, columnType] = columnMatch
      
      return [
        {
          stepNumber: 1,
          description: `Add ${columnName} as nullable column`,
          sql: `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`,
          riskLevel: 'LOW',
          estimatedDuration: 5,
          canRollback: true,
          dependencies: [],
          validationQueries: [`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 2,
          description: `Populate ${columnName} with default values`,
          sql: `UPDATE ${tableName} SET ${columnName} = '' WHERE ${columnName} IS NULL;`,
          riskLevel: 'MEDIUM',
          estimatedDuration: 30,
          canRollback: true,
          dependencies: [],
          validationQueries: [`SELECT COUNT(*) FROM ${tableName} WHERE ${columnName} IS NULL`],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 3,
          description: `Apply NOT NULL constraint to ${columnName}`,
          sql: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;`,
          riskLevel: 'LOW',
          estimatedDuration: 5,
          canRollback: true,
          dependencies: [],
          validationQueries: [`SELECT is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`],
          onFailure: 'ROLLBACK'
        }
      ]
    },
    example: {
      before: 'ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;',
      after: `-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN email VARCHAR(255);
-- Step 2: Populate with defaults  
UPDATE users SET email = '' WHERE email IS NULL;
-- Step 3: Apply NOT NULL constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;`,
      explanation: 'Prevents migration failures when adding NOT NULL columns to tables with existing data'
    }
  },

  {
    id: 'concurrent-index-creation',
    name: 'Concurrent Index Creation',
    description: 'Create indexes concurrently to avoid table locks',
    category: 'PERFORMANCE',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('create index') && !sql.toLowerCase().includes('concurrently'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Create index concurrently to avoid table locks',
      sql: sql.replace(/CREATE INDEX/gi, 'CREATE INDEX CONCURRENTLY'),
      riskLevel: 'LOW',
      estimatedDuration: 120,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'CONTINUE'
    }],
    example: {
      before: 'CREATE INDEX idx_user_email ON users(email);',
      after: 'CREATE INDEX CONCURRENTLY idx_user_email ON users(email);',
      explanation: 'Avoids blocking table writes during index creation, essential for production databases'
    }
  },

  {
    id: 'constraint-not-valid',
    name: 'Safe Constraint Addition',
    description: 'Add constraints as NOT VALID first, then validate separately',
    category: 'SAFETY',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('add constraint') && !sql.toLowerCase().includes('not valid'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/alter\s+table\s+(\w+)/i)
      const constraintMatch = sql.match(/add\s+constraint\s+(\w+)/i)
      if (!tableMatch || !constraintMatch) return []
      
      const [, tableName] = tableMatch
      const [, constraintName] = constraintMatch
      
      return [
        {
          stepNumber: 1,
          description: 'Add constraint without validation',
          sql: sql.replace(/;?\s*$/, ' NOT VALID;'),
          riskLevel: 'LOW',
          estimatedDuration: 5,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 2,
          description: 'Validate constraint in separate transaction',
          sql: `ALTER TABLE ${tableName} VALIDATE CONSTRAINT ${constraintName};`,
          riskLevel: 'MEDIUM',
          estimatedDuration: 60,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        }
      ]
    },
    example: {
      before: 'ALTER TABLE orders ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id);',
      after: `ALTER TABLE orders ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT fk_customer;`,
      explanation: 'Reduces lock time by adding constraint without validation first, then validating separately'
    }
  },

  {
    id: 'data-backup-before-drop',
    name: 'Data Backup Before Destructive Operations',
    description: 'Create backups before dropping columns or tables',
    category: 'SAFETY',
    priority: 'CRITICAL',
    applies: (sql: string) => sql.toLowerCase().includes('drop column') || sql.toLowerCase().includes('drop table'),
    enhance: (sql: string) => {
      const dropColumnMatch = sql.match(/alter\s+table\s+(\w+)\s+drop\s+column\s+(\w+)/i)
      const dropTableMatch = sql.match(/drop\s+table\s+(\w+)/i)
      
      if (dropColumnMatch) {
        const [, tableName, columnName] = dropColumnMatch
        return [
          {
            stepNumber: 1,
            description: `Backup ${columnName} data before dropping`,
            sql: `CREATE TABLE ${tableName}_${columnName}_backup AS SELECT id, ${columnName} FROM ${tableName};`,
            riskLevel: 'LOW',
            estimatedDuration: 30,
            canRollback: true,
            dependencies: [],
            validationQueries: [`SELECT COUNT(*) FROM ${tableName}_${columnName}_backup`],
            onFailure: 'STOP'
          },
          {
            stepNumber: 2,
            description: `Drop column ${columnName}`,
            sql: sql,
            riskLevel: 'HIGH',
            estimatedDuration: 15,
            canRollback: false,
            dependencies: [],
            validationQueries: [],
            onFailure: 'STOP'
          }
        ]
      } else if (dropTableMatch) {
        const [, tableName] = dropTableMatch
        return [
          {
            stepNumber: 1,
            description: `Backup table ${tableName} before dropping`,
            sql: `CREATE TABLE ${tableName}_backup_${Date.now()} AS SELECT * FROM ${tableName};`,
            riskLevel: 'LOW',
            estimatedDuration: 60,
            canRollback: true,
            dependencies: [],
            validationQueries: [`SELECT COUNT(*) FROM ${tableName}_backup_${Date.now()}`],
            onFailure: 'STOP'
          },
          {
            stepNumber: 2,
            description: `Drop table ${tableName}`,
            sql: sql,
            riskLevel: 'CRITICAL',
            estimatedDuration: 5,
            canRollback: false,
            dependencies: [],
            validationQueries: [],
            onFailure: 'STOP'
          }
        ]
      }
      return []
    },
    example: {
      before: 'ALTER TABLE users DROP COLUMN old_field;',
      after: `CREATE TABLE users_old_field_backup AS SELECT id, old_field FROM users;
ALTER TABLE users DROP COLUMN old_field;`,
      explanation: 'Creates a backup table with the data being dropped, enabling recovery if needed'
    }
  },

  {
    id: 'query-timeout-setting',
    name: 'Query Timeout Configuration',
    description: 'Set appropriate timeouts to prevent long-running locks',
    category: 'RELIABILITY',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('alter table') || sql.toLowerCase().includes('create index'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Configure query timeouts for safety',
      sql: `SET statement_timeout = '10min';
SET lock_timeout = '30s';
${sql}
RESET statement_timeout;
RESET lock_timeout;`,
      riskLevel: 'LOW',
      estimatedDuration: 5,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'CONTINUE'
    }],
    example: {
      before: 'ALTER TABLE users ADD COLUMN status VARCHAR(20);',
      after: `SET statement_timeout = '10min';
SET lock_timeout = '30s';
ALTER TABLE users ADD COLUMN status VARCHAR(20);
RESET statement_timeout;
RESET lock_timeout;`,
      explanation: 'Prevents indefinite locks by setting reasonable timeout limits'
    }
  },

  {
    id: 'transaction-isolation',
    name: 'Proper Transaction Isolation',
    description: 'Wrap operations in appropriate transaction boundaries',
    category: 'RELIABILITY',
    priority: 'MEDIUM',
    applies: (sql: string) => !sql.toLowerCase().includes('begin') && !sql.toLowerCase().includes('start transaction'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Execute with proper transaction boundaries',
      sql: `BEGIN;
${sql}
COMMIT;`,
      riskLevel: 'LOW',
      estimatedDuration: 5,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'ROLLBACK'
    }],
    example: {
      before: 'UPDATE users SET status = \'active\' WHERE created_at > NOW() - INTERVAL \'1 day\';',
      after: `BEGIN;
UPDATE users SET status = 'active' WHERE created_at > NOW() - INTERVAL '1 day';
COMMIT;`,
      explanation: 'Ensures atomic execution and enables rollback if errors occur'
    }
  },

  {
    id: 'batch-updates',
    name: 'Batch Large Updates',
    description: 'Break large updates into smaller batches to reduce lock time',
    category: 'PERFORMANCE',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('update') && !sql.toLowerCase().includes('limit'),
    enhance: (sql: string) => {
      const updateMatch = sql.match(/update\s+(\w+)\s+set\s+(.+?)\s+where\s+(.+)/i)
      if (!updateMatch) return []
      
      const [, tableName, setClause, whereClause] = updateMatch
      return [
        {
          stepNumber: 1,
          description: 'Update records in batches to reduce lock time',
          sql: `DO $$
DECLARE
  batch_size INTEGER := 1000;
  rows_affected INTEGER;
BEGIN
  LOOP
    UPDATE ${tableName} SET ${setClause} 
    WHERE ${whereClause} AND ctid IN (
      SELECT ctid FROM ${tableName} 
      WHERE ${whereClause} 
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    EXIT WHEN rows_affected = 0;
    
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;`,
          riskLevel: 'MEDIUM',
          estimatedDuration: 120,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        }
      ]
    },
    example: {
      before: 'UPDATE users SET last_login = NOW() WHERE status = \'inactive\';',
      after: `-- Updates in batches of 1000 to reduce lock time
DO $$
DECLARE
  batch_size INTEGER := 1000;
  rows_affected INTEGER;
BEGIN
  LOOP
    UPDATE users SET last_login = NOW() 
    WHERE status = 'inactive' AND ctid IN (
      SELECT ctid FROM users 
      WHERE status = 'inactive' 
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    EXIT WHEN rows_affected = 0;
    
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;`,
      explanation: 'Reduces table lock time by processing records in small batches with short breaks'
    }
  },

  {
    id: 'enum-safe-addition',
    name: 'Safe ENUM Value Addition',
    description: 'Add ENUM values safely without recreating the type',
    category: 'SAFETY',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('alter type') && sql.toLowerCase().includes('add value'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Add ENUM value with IF NOT EXISTS check',
      sql: sql.replace(/ADD VALUE/gi, 'ADD VALUE IF NOT EXISTS'),
      riskLevel: 'LOW',
      estimatedDuration: 5,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'ROLLBACK'
    }],
    example: {
      before: 'ALTER TYPE user_status ADD VALUE \'suspended\';',
      after: 'ALTER TYPE user_status ADD VALUE IF NOT EXISTS \'suspended\';',
      explanation: 'Prevents errors if the ENUM value already exists, making migrations idempotent'
    }
  },

  {
    id: 'index-naming-convention',
    name: 'Standardized Index Naming',
    description: 'Ensure consistent index naming conventions',
    category: 'RELIABILITY',
    priority: 'LOW',
    applies: (sql: string) => sql.toLowerCase().includes('create index'),
    enhance: (sql: string) => {
      const indexMatch = sql.match(/create\s+index\s+(?:concurrently\s+)?(\w+)/i)
      const tableMatch = sql.match(/on\s+(\w+)/i)
      
      if (indexMatch && tableMatch) {
        const [, indexName] = indexMatch
        const [, tableName] = tableMatch
        
        // Check if index follows naming convention (idx_tablename_columns)
        if (!indexName.startsWith(`idx_${tableName}`)) {
          const enhancedSQL = sql.replace(indexName, `idx_${tableName}_${indexName}`)
          return [{
            stepNumber: 1,
            description: 'Create index with standardized naming convention',
            sql: enhancedSQL,
            riskLevel: 'LOW',
            estimatedDuration: 60,
            canRollback: true,
            dependencies: [],
            validationQueries: [],
            onFailure: 'ROLLBACK'
          }]
        }
      }
      return []
    },
    example: {
      before: 'CREATE INDEX user_email ON users(email);',
      after: 'CREATE INDEX idx_users_user_email ON users(email);',
      explanation: 'Standardizes index names for better maintainability and consistency'
    }
  },

  {
    id: 'foreign-key-validation',
    name: 'Foreign Key Data Validation',
    description: 'Validate referential integrity before adding foreign keys',
    category: 'VALIDATION',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('foreign key'),
    enhance: (sql: string) => {
      const fkMatch = sql.match(/alter\s+table\s+(\w+)\s+add\s+constraint\s+\w+\s+foreign\s+key\s*\((\w+)\)\s+references\s+(\w+)\s*\((\w+)\)/i)
      if (!fkMatch) return []
      
      const [, childTable, childColumn, parentTable, parentColumn] = fkMatch
      
      return [
        {
          stepNumber: 1,
          description: 'Validate referential integrity before adding foreign key',
          sql: `DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ${childTable} c
    LEFT JOIN ${parentTable} p ON c.${childColumn} = p.${parentColumn}
    WHERE c.${childColumn} IS NOT NULL AND p.${parentColumn} IS NULL
  ) THEN
    RAISE EXCEPTION 'Referential integrity violation: orphaned records found in ${childTable}.${childColumn}';
  END IF;
END $$;`,
          riskLevel: 'MEDIUM',
          estimatedDuration: 30,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'STOP'
        },
        {
          stepNumber: 2,
          description: 'Add foreign key constraint',
          sql: sql,
          riskLevel: 'MEDIUM',
          estimatedDuration: 15,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        }
      ]
    },
    example: {
      before: 'ALTER TABLE orders ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id);',
      after: `-- Validate referential integrity first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.customer_id IS NOT NULL AND c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Referential integrity violation: orphaned records found';
  END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE orders ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id);`,
      explanation: 'Prevents foreign key creation failures by validating data integrity first'
    }
  },

  // PERFORMANCE ENHANCEMENTS (11-25)
  {
    id: 'analyze-after-changes',
    name: 'Update Statistics After Schema Changes',
    description: 'Update table statistics after structural changes',
    category: 'PERFORMANCE',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('alter table') || sql.toLowerCase().includes('create index'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/(?:alter\s+table|on)\s+(\w+)/i)
      if (!tableMatch) return []
      
      const [, tableName] = tableMatch
      return [
        {
          stepNumber: 1,
          description: 'Execute schema change',
          sql: sql,
          riskLevel: 'MEDIUM',
          estimatedDuration: 30,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 2,
          description: 'Update table statistics for query planner',
          sql: `ANALYZE ${tableName};`,
          riskLevel: 'LOW',
          estimatedDuration: 10,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        }
      ]
    },
    example: {
      before: 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP;',
      after: `ALTER TABLE users ADD COLUMN created_at TIMESTAMP;
ANALYZE users;`,
      explanation: 'Updates query planner statistics to ensure optimal query performance after schema changes'
    }
  },

  {
    id: 'vacuum-after-bulk-changes',
    name: 'Vacuum After Bulk Operations',
    description: 'Reclaim space and update statistics after bulk changes',
    category: 'PERFORMANCE',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('update') || sql.toLowerCase().includes('delete'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/(?:update|delete\s+from)\s+(\w+)/i)
      if (!tableMatch) return []
      
      const [, tableName] = tableMatch
      return [
        {
          stepNumber: 1,
          description: 'Execute bulk operation',
          sql: sql,
          riskLevel: 'MEDIUM',
          estimatedDuration: 60,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 2,
          description: 'Vacuum table to reclaim space and update statistics',
          sql: `VACUUM ANALYZE ${tableName};`,
          riskLevel: 'LOW',
          estimatedDuration: 30,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        }
      ]
    },
    example: {
      before: 'DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL \'1 year\';',
      after: `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
VACUUM ANALYZE audit_logs;`,
      explanation: 'Reclaims disk space and updates statistics after bulk delete operations'
    }
  },

  {
    id: 'partial-index-optimization',
    name: 'Partial Index Optimization',
    description: 'Suggest partial indexes for filtered queries',
    category: 'PERFORMANCE',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('create index') && !sql.toLowerCase().includes('where'),
    enhance: (sql: string) => {
      // This is a suggestion enhancement - doesn't modify the SQL but suggests optimization
      return [{
        stepNumber: 1,
        description: 'Create index (consider partial index for better performance)',
        sql: `${sql}
-- OPTIMIZATION SUGGESTION: Consider a partial index if this column has many NULL values or a common filter condition
-- Example: CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;`,
        riskLevel: 'LOW',
        estimatedDuration: 60,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      }]
    },
    example: {
      before: 'CREATE INDEX idx_users_status ON users(status);',
      after: `CREATE INDEX idx_users_status ON users(status);
-- OPTIMIZATION SUGGESTION: Consider partial index for active users only:
-- CREATE INDEX idx_users_active_status ON users(status) WHERE status = 'active';`,
      explanation: 'Suggests partial indexes to reduce index size and improve performance for filtered queries'
    }
  },

  {
    id: 'connection-pooling-check',
    name: 'Connection Pool Validation',
    description: 'Validate connection pool settings before long operations',
    category: 'RELIABILITY',
    priority: 'LOW',
    applies: (sql: string) => sql.toLowerCase().includes('create index') || (sql.toLowerCase().includes('alter table') && sql.toLowerCase().includes('add column')),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Execute with connection pool awareness',
      sql: `-- Connection pool check: Ensure sufficient connections for migration
-- Current active connections should be monitored during this operation
${sql}`,
      riskLevel: 'LOW',
      estimatedDuration: 60,
      canRollback: true,
      dependencies: [],
      validationQueries: ['SELECT count(*) FROM pg_stat_activity WHERE state = \'active\''],
      onFailure: 'CONTINUE'
    }],
    example: {
      before: 'CREATE INDEX idx_large_table_column ON large_table(column);',
      after: `-- Connection pool check: Ensure sufficient connections for migration
-- Current active connections should be monitored during this operation
CREATE INDEX idx_large_table_column ON large_table(column);`,
      explanation: 'Adds awareness about connection pool impact during long-running operations'
    }
  },

  {
    id: 'memory-usage-optimization',
    name: 'Memory Usage Optimization',
    description: 'Configure memory settings for large operations',
    category: 'PERFORMANCE',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('create index') || sql.toLowerCase().includes('alter table'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Optimize memory settings for operation',
      sql: `-- Temporarily increase work memory for this operation
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';

${sql}

-- Reset to default values
RESET work_mem;
RESET maintenance_work_mem;`,
      riskLevel: 'LOW',
      estimatedDuration: 60,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'CONTINUE'
    }],
    example: {
      before: 'CREATE INDEX idx_users_name ON users(first_name, last_name);',
      after: `-- Temporarily increase work memory for this operation
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';

CREATE INDEX idx_users_name ON users(first_name, last_name);

-- Reset to default values
RESET work_mem;
RESET maintenance_work_mem;`,
      explanation: 'Optimizes memory usage for index creation and other memory-intensive operations'
    }
  },

  // MONITORING ENHANCEMENTS (26-35)
  {
    id: 'progress-monitoring',
    name: 'Progress Monitoring for Long Operations',
    description: 'Add progress monitoring for long-running operations',
    category: 'MONITORING',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('create index') || sql.toLowerCase().includes('reindex'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Execute with progress monitoring',
      sql: `-- Enable progress reporting for index operations
SET log_statement = 'all';
SET log_min_duration_statement = 0;

${sql}

-- Monitor progress with:
-- SELECT phase, round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS "%" FROM pg_stat_progress_create_index;

RESET log_statement;
RESET log_min_duration_statement;`,
      riskLevel: 'LOW',
      estimatedDuration: 120,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'CONTINUE'
    }],
    example: {
      before: 'CREATE INDEX idx_orders_date ON orders(created_at);',
      after: `-- Enable progress reporting for index operations
SET log_statement = 'all';
SET log_min_duration_statement = 0;

CREATE INDEX idx_orders_date ON orders(created_at);

-- Monitor progress with:
-- SELECT phase, round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS "%" FROM pg_stat_progress_create_index;

RESET log_statement;
RESET log_min_duration_statement;`,
      explanation: 'Enables progress monitoring for long-running index creation operations'
    }
  },

  {
    id: 'lock-monitoring',
    name: 'Lock Monitoring and Alerting',
    description: 'Monitor locks during critical operations',
    category: 'MONITORING',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('alter table') || sql.toLowerCase().includes('drop'),
    enhance: (sql: string) => [{
      stepNumber: 1,
      description: 'Execute with lock monitoring',
      sql: `-- Monitor locks before and during operation
SELECT 
  pg_stat_activity.pid,
  pg_stat_activity.query,
  pg_locks.mode,
  pg_locks.granted
FROM pg_locks 
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE NOT pg_locks.granted;

${sql}

-- Check for remaining locks after operation
SELECT count(*) as remaining_locks FROM pg_locks WHERE NOT granted;`,
      riskLevel: 'MEDIUM',
      estimatedDuration: 30,
      canRollback: true,
      dependencies: [],
      validationQueries: ['SELECT count(*) FROM pg_locks WHERE NOT granted'],
      onFailure: 'ROLLBACK'
    }],
    example: {
      before: 'ALTER TABLE users DROP COLUMN deprecated_field;',
      after: `-- Monitor locks before and during operation
SELECT 
  pg_stat_activity.pid,
  pg_stat_activity.query,
  pg_locks.mode,
  pg_locks.granted
FROM pg_locks 
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE NOT pg_locks.granted;

ALTER TABLE users DROP COLUMN deprecated_field;

-- Check for remaining locks after operation
SELECT count(*) as remaining_locks FROM pg_locks WHERE NOT granted;`,
      explanation: 'Monitors database locks to detect potential blocking issues during schema changes'
    }
  },

  {
    id: 'performance-impact-measurement',
    name: 'Performance Impact Measurement',
    description: 'Measure performance impact before and after changes',
    category: 'MONITORING',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('create index') || sql.toLowerCase().includes('alter table'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/(?:alter\s+table|on)\s+(\w+)/i)
      if (!tableMatch) return []
      
      const [, tableName] = tableMatch
      return [{
        stepNumber: 1,
        description: 'Measure performance impact',
        sql: `-- Measure performance before change
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables 
WHERE tablename = '${tableName}';

${sql}

-- Measure performance after change
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables 
WHERE tablename = '${tableName}';`,
        riskLevel: 'LOW',
        estimatedDuration: 60,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'CONTINUE'
      }]
    },
    example: {
      before: 'CREATE INDEX idx_users_email ON users(email);',
      after: `-- Measure performance before change
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables 
WHERE tablename = 'users';

CREATE INDEX idx_users_email ON users(email);

-- Measure performance after change
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables 
WHERE tablename = 'users';`,
      explanation: 'Captures performance metrics to measure the impact of schema changes'
    }
  },

  // VALIDATION ENHANCEMENTS (36-45)
  {
    id: 'data-integrity-check',
    name: 'Comprehensive Data Integrity Validation',
    description: 'Validate data integrity after schema changes',
    category: 'VALIDATION',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('alter table') || sql.toLowerCase().includes('update'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/(?:alter\s+table|update)\s+(\w+)/i)
      if (!tableMatch) return []
      
      const [, tableName] = tableMatch
      return [
        {
          stepNumber: 1,
          description: 'Execute operation',
          sql: sql,
          riskLevel: 'MEDIUM',
          estimatedDuration: 30,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 2,
          description: 'Validate data integrity',
          sql: `-- Comprehensive data integrity checks
SELECT 
  'Null checks' as check_type,
  count(*) as issues_found
FROM ${tableName} 
WHERE id IS NULL
UNION ALL
SELECT 
  'Duplicate checks' as check_type,
  count(*) - count(DISTINCT id) as issues_found
FROM ${tableName}
UNION ALL
SELECT
  'Constraint violations' as check_type,
  count(*) as issues_found
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = '${tableName}' AND tc.constraint_type = 'CHECK';`,
          riskLevel: 'LOW',
          estimatedDuration: 15,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        }
      ]
    },
    example: {
      before: 'ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;',
      after: `ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Comprehensive data integrity checks
SELECT 
  'Null checks' as check_type,
  count(*) as issues_found
FROM users 
WHERE id IS NULL
UNION ALL
SELECT 
  'Duplicate checks' as check_type,
  count(*) - count(DISTINCT id) as issues_found
FROM users;`,
      explanation: 'Performs comprehensive data integrity validation after schema changes'
    }
  },

  {
    id: 'constraint-verification',
    name: 'Constraint Verification',
    description: 'Verify all constraints are properly enforced',
    category: 'VALIDATION',
    priority: 'HIGH',
    applies: (sql: string) => sql.toLowerCase().includes('add constraint'),
    enhance: (sql: string) => {
      const tableMatch = sql.match(/alter\s+table\s+(\w+)/i)
      const constraintMatch = sql.match(/add\s+constraint\s+(\w+)/i)
      
      if (!tableMatch || !constraintMatch) return []
      
      const [, tableName] = tableMatch
      const [, constraintName] = constraintMatch
      
      return [
        {
          stepNumber: 1,
          description: 'Add constraint',
          sql: sql,
          riskLevel: 'MEDIUM',
          estimatedDuration: 30,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        },
        {
          stepNumber: 2,
          description: 'Verify constraint is properly enforced',
          sql: `-- Verify constraint was created and is active
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause,
  tc.is_deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = '${tableName}' 
  AND tc.constraint_name = '${constraintName}';

-- Test constraint enforcement (this should fail if constraint is working)
-- INSERT INTO ${tableName} VALUES (/* values that should violate constraint */);`,
          riskLevel: 'LOW',
          estimatedDuration: 10,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        }
      ]
    },
    example: {
      before: 'ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age >= 0);',
      after: `ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age >= 0);

-- Verify constraint was created and is active
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause,
  tc.is_deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
  AND tc.constraint_name = 'chk_age';`,
      explanation: 'Verifies that constraints are properly created and enforced'
    }
  },

  // ROLLBACK ENHANCEMENTS (46-50)
  {
    id: 'automatic-rollback-script',
    name: 'Automatic Rollback Script Generation',
    description: 'Generate rollback scripts for all operations',
    category: 'ROLLBACK',
    priority: 'HIGH',
    applies: (sql: string) => true,
    enhance: (sql: string) => {
      const rollbackSQL = generateRollbackSQL(sql)
      return [{
        stepNumber: 1,
        description: 'Execute with rollback script generation',
        sql: `${sql}

-- GENERATED ROLLBACK SCRIPT (save this for emergency rollback):
/*
${rollbackSQL}
*/`,
        riskLevel: 'MEDIUM',
        estimatedDuration: 30,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      }]
    },
    example: {
      before: 'ALTER TABLE users ADD COLUMN email VARCHAR(255);',
      after: `ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- GENERATED ROLLBACK SCRIPT (save this for emergency rollback):
/*
ALTER TABLE users DROP COLUMN email;
*/`,
      explanation: 'Automatically generates rollback scripts for quick recovery'
    }
  },

  {
    id: 'rollback-testing',
    name: 'Rollback Testing',
    description: 'Test rollback procedures before applying changes',
    category: 'ROLLBACK',
    priority: 'MEDIUM',
    applies: (sql: string) => sql.toLowerCase().includes('alter table') || sql.toLowerCase().includes('create index'),
    enhance: (sql: string) => {
      const rollbackSQL = generateRollbackSQL(sql)
      return [
        {
          stepNumber: 1,
          description: 'Test rollback procedure in transaction',
          sql: `-- Test rollback procedure
BEGIN;
${sql}
-- Verify change was applied
${rollbackSQL}
-- Verify rollback worked
ROLLBACK;

-- Now apply the actual change
${sql}`,
          riskLevel: 'LOW',
          estimatedDuration: 60,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        }
      ]
    },
    example: {
      before: 'CREATE INDEX idx_users_email ON users(email);',
      after: `-- Test rollback procedure
BEGIN;
CREATE INDEX idx_users_email ON users(email);
-- Verify change was applied
DROP INDEX idx_users_email;
-- Verify rollback worked
ROLLBACK;

-- Now apply the actual change
CREATE INDEX idx_users_email ON users(email);`,
      explanation: 'Tests the rollback procedure before applying changes to ensure recovery is possible'
    }
  }
]

function generateRollbackSQL(sql: string): string {
  const sqlLower = sql.toLowerCase()
  
  if (sqlLower.includes('alter table') && sqlLower.includes('add column')) {
    const tableMatch = sql.match(/alter\s+table\s+(\w+)/i)
    const columnMatch = sql.match(/add\s+column\s+(\w+)/i)
    if (tableMatch && columnMatch) {
      return `ALTER TABLE ${tableMatch[1]} DROP COLUMN ${columnMatch[1]};`
    }
  }
  
  if (sqlLower.includes('create index')) {
    const indexMatch = sql.match(/create\s+index\s+(?:concurrently\s+)?(\w+)/i)
    if (indexMatch) {
      return `DROP INDEX ${indexMatch[1]};`
    }
  }
  
  if (sqlLower.includes('alter table') && sqlLower.includes('add constraint')) {
    const tableMatch = sql.match(/alter\s+table\s+(\w+)/i)
    const constraintMatch = sql.match(/add\s+constraint\s+(\w+)/i)
    if (tableMatch && constraintMatch) {
      return `ALTER TABLE ${tableMatch[1]} DROP CONSTRAINT ${constraintMatch[1]};`
    }
  }
  
  return '-- Manual rollback required'
}

/**
 * Apply enhancement rules to SQL
 */
export function applyEnhancements(sql: string): MigrationStep[] {
  const applicableRules = ENHANCEMENT_RULES.filter(rule => rule.applies(sql))
  
  if (applicableRules.length === 0) {
    return [{
      stepNumber: 1,
      description: 'Execute migration as-is',
      sql: sql,
      riskLevel: 'MEDIUM',
      estimatedDuration: 30,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'ROLLBACK'
    }]
  }
  
  // Apply the highest priority rule
  const highestPriorityRule = applicableRules.reduce((prev, current) => {
    const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
    return priorityOrder[current.priority] > priorityOrder[prev.priority] ? current : prev
  })
  
  return highestPriorityRule.enhance(sql)
}