import { createFileRoute } from '@tanstack/react-router'
import { DocsLayout } from '../components/docs/docs-layout'

export const Route = createFileRoute('/docs/flow/enhancements')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DocsLayout title="Migration Enhancements - DriftJS Flow">
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>Migration Enhancements</h1>
        <p className="lead">
          DriftJS Flow automatically analyzes your migrations and applies 50+ production-ready enhancements 
          to ensure zero-downtime deployments, data safety, and optimal performance.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Automatic Enhancement
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>All enhancements are applied automatically when you run <code>flow sync</code>. No manual configuration required.</p>
              </div>
            </div>
          </div>
        </div>

        <h2>Safety Enhancements</h2>
        <p>Critical safety features that prevent data loss and migration failures.</p>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🛡️ Safe NOT NULL Column Addition</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Prevents migration failures when adding NOT NULL columns to tables with existing data.
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400">❌ Before (Risky)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;`}</code>
                </pre>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠️ Fails if table has existing rows without email values</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-600 dark:text-green-400">✅ After (Safe)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Step 2: Populate with defaults  
UPDATE users SET email = 'pending@example.com' WHERE email IS NULL;

-- Step 3: Apply NOT NULL constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;`}</code>
                </pre>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✅ Safe multi-step approach prevents failures</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">⚡ Concurrent Index Creation</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Creates indexes without blocking table writes, essential for production databases.
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400">❌ Before (Blocking)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`CREATE INDEX idx_user_email ON users(email);`}</code>
                </pre>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠️ Blocks all writes to the table during creation</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-600 dark:text-green-400">✅ After (Non-blocking)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`CREATE INDEX CONCURRENTLY idx_user_email ON users(email);`}</code>
                </pre>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✅ Allows concurrent writes during index creation</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🔒 Safe Constraint Addition</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Adds constraints with NOT VALID first, then validates separately to reduce lock time.
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400">❌ Before (Long Lock)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`ALTER TABLE orders ADD CONSTRAINT fk_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id);`}</code>
                </pre>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠️ Long lock while validating all existing data</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-600 dark:text-green-400">✅ After (Minimal Lock)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`-- Step 1: Add constraint without validation (fast)
ALTER TABLE orders ADD CONSTRAINT fk_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;

-- Step 2: Validate in separate transaction
ALTER TABLE orders VALIDATE CONSTRAINT fk_customer;`}</code>
                </pre>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✅ Minimal lock time with separate validation</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">💾 Data Backup Before Destructive Operations</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Automatically creates backups before dropping columns or tables.
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400">❌ Before (Risky)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`ALTER TABLE users DROP COLUMN old_field;`}</code>
                </pre>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠️ Data is permanently lost</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-600 dark:text-green-400">✅ After (Safe)</h4>
                <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
                  <code>{`-- Step 1: Backup data
CREATE TABLE users_old_field_backup AS 
SELECT id, old_field FROM users;

-- Step 2: Drop column safely
ALTER TABLE users DROP COLUMN old_field;`}</code>
                </pre>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✅ Data preserved in backup table for recovery</p>
              </div>
            </div>
          </div>
        </div>

        <h2>Performance Enhancements</h2>
        <p>Optimizations that improve migration speed and reduce system impact.</p>

        <div className="grid gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">📊 Statistics Updates After Changes</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Automatically updates query planner statistics after schema changes.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`ALTER TABLE users ADD COLUMN created_at TIMESTAMP;
ANALYZE users; -- Updates statistics for optimal query planning`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🧹 Vacuum After Bulk Operations</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Reclaims disk space and updates statistics after bulk changes.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
VACUUM ANALYZE audit_logs; -- Reclaim space and update stats`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">⚡ Batch Large Updates</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Breaks large updates into smaller batches to reduce lock time.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Instead of one large update, process in batches
DO $$
DECLARE
  batch_size INTEGER := 1000;
  rows_affected INTEGER;
BEGIN
  LOOP
    UPDATE users SET status = 'active' 
    WHERE inactive_date < NOW() - INTERVAL '30 days'
    LIMIT batch_size;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    EXIT WHEN rows_affected = 0;
    
    COMMIT;
    PERFORM pg_sleep(0.1); -- Brief pause between batches
  END LOOP;
END $$;`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">💾 Memory Usage Optimization</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Configures optimal memory settings for large operations.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Optimize memory for index creation
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';

CREATE INDEX CONCURRENTLY idx_users_name ON users(first_name, last_name);

-- Reset to defaults
RESET work_mem;
RESET maintenance_work_mem;`}</code>
            </pre>
          </div>
        </div>

        <h2>Monitoring & Validation</h2>
        <p>Advanced monitoring and validation features for production safety.</p>

        <div className="grid gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">📈 Progress Monitoring</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Real-time progress tracking for long-running operations.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Monitor index creation progress
SELECT 
  phase,
  round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS "%"
FROM pg_stat_progress_create_index;`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🔐 Lock Monitoring</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Monitors database locks to detect potential blocking issues.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Monitor locks during operation
SELECT 
  pg_stat_activity.pid,
  pg_stat_activity.query,
  pg_locks.mode,
  pg_locks.granted
FROM pg_locks 
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE NOT pg_locks.granted;`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">✅ Data Integrity Validation</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Comprehensive data integrity checks after schema changes.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Comprehensive integrity checks
SELECT 
  'Null checks' as check_type,
  count(*) as issues_found
FROM users WHERE id IS NULL
UNION ALL
SELECT 
  'Duplicate checks' as check_type,
  count(*) - count(DISTINCT id) as issues_found
FROM users;`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🔍 Foreign Key Validation</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Validates referential integrity before adding foreign keys.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Check for orphaned records before adding FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.customer_id IS NOT NULL AND c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Orphaned records found in orders.customer_id';
  END IF;
END $$;`}</code>
            </pre>
          </div>
        </div>

        <h2>Rollback & Recovery</h2>
        <p>Advanced rollback capabilities and recovery strategies.</p>

        <div className="grid gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🔄 Automatic Rollback Scripts</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Generates rollback scripts for all operations automatically.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- GENERATED ROLLBACK SCRIPT (save for emergency rollback):
/*
ALTER TABLE users DROP COLUMN email;
*/`}</code>
            </pre>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">🧪 Rollback Testing</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Tests rollback procedures before applying changes.
            </p>
            <pre className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm overflow-x-auto">
              <code>{`-- Test rollback in transaction first
BEGIN;
CREATE INDEX idx_users_email ON users(email);
-- Verify rollback works
DROP INDEX idx_users_email;
ROLLBACK;

-- Now apply the actual change
CREATE INDEX idx_users_email ON users(email);`}</code>
            </pre>
          </div>
        </div>

        <h2>Complete Enhancement List</h2>
        <p>DriftJS Flow includes 50+ enhancement patterns across all categories:</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">🛡️ Safety (15 patterns)</h4>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• Safe NOT NULL addition</li>
              <li>• Constraint NOT VALID</li>
              <li>• Data backup before drops</li>
              <li>• Query timeout configuration</li>
              <li>• Transaction isolation</li>
              <li>• Safe ENUM additions</li>
              <li>• FK data validation</li>
              <li>• Constraint verification</li>
              <li>• Connection pool awareness</li>
              <li>• Deadlock prevention</li>
              <li>• ... and 5 more</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">⚡ Performance (15 patterns)</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Concurrent index creation</li>
              <li>• Batch large updates</li>
              <li>• Statistics updates</li>
              <li>• Vacuum after bulk ops</li>
              <li>• Memory optimization</li>
              <li>• Partial index suggestions</li>
              <li>• Index naming standards</li>
              <li>• Query plan analysis</li>
              <li>• Connection pooling</li>
              <li>• Resource monitoring</li>
              <li>• ... and 5 more</li>
            </ul>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📊 Monitoring (10 patterns)</h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Progress tracking</li>
              <li>• Lock monitoring</li>
              <li>• Performance impact measurement</li>
              <li>• Resource usage alerts</li>
              <li>• Query performance tracking</li>
              <li>• Error rate monitoring</li>
              <li>• Capacity planning metrics</li>
              <li>• ... and 3 more</li>
            </ul>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">✅ Validation (10 patterns)</h4>
            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <li>• Data integrity checks</li>
              <li>• Constraint verification</li>
              <li>• FK validation</li>
              <li>• Schema consistency</li>
              <li>• Index effectiveness</li>
              <li>• Performance validation</li>
              <li>• Compliance checks</li>
              <li>• ... and 3 more</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">🔄 Rollback (5 patterns)</h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Automatic rollback scripts</li>
              <li>• Rollback testing</li>
              <li>• Recovery procedures</li>
              <li>• Backup validation</li>
              <li>• Emergency procedures</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🔧 Reliability (5 patterns)</h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• Idempotent operations</li>
              <li>• Error handling</li>
              <li>• Retry mechanisms</li>
              <li>• Failure recovery</li>
              <li>• System health checks</li>
            </ul>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">🚀 Ready to Get Started?</h3>
          <p className="text-green-700 dark:text-green-300 mb-4">
            All these enhancements are applied automatically when you use DriftJS Flow. No manual configuration required!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href="/docs/flow/quick-start" 
              className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-700 rounded-md text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30"
            >
              Quick Start Guide
            </a>
            <a 
              href="/docs/flow/installation" 
              className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-700 rounded-md text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30"
            >
              Installation
            </a>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}