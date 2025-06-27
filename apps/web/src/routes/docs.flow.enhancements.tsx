import { createFileRoute } from '@tanstack/react-router'
import DocsLayout from '../components/docs/docs-layout'

export const Route = createFileRoute('/docs/flow/enhancements')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DocsLayout title="Migration Enhancements - DriftJS Flow">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-4">
            🧠 Migration Enhancements
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            DriftJS Flow automatically analyzes your migrations and applies 50+ production-ready enhancements 
            to ensure zero-downtime deployments, data safety, and optimal performance.
          </p>
        </div>

        {/* Quick Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                ✨ Automatic Enhancement
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                All enhancements are applied automatically when you run <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-sm">flow enhance</code>. 
                No manual configuration required - just run the command and Flow intelligently improves your migrations!
              </p>
            </div>
          </div>
        </div>

        {/* Enhancement Categories */}
        <div className="grid gap-6 md:grid-cols-4 mb-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">🛡️ Safety (15 patterns)</h4>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• Safe NOT NULL addition</li>
              <li>• Constraint NOT VALID</li>
              <li>• Data backup before drops</li>
              <li>• Transaction wrappers</li>
              <li>• Cascade safety checks</li>
              <li>• ... and 10 more</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">⚡ Performance (15 patterns)</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Concurrent index creation</li>
              <li>• Batch large updates</li>
              <li>• Statistics updates</li>
              <li>• Smart index analysis</li>
              <li>• Vacuum after bulk ops</li>
              <li>• ... and 10 more</li>
            </ul>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📊 Monitoring (10 patterns)</h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Progress tracking</li>
              <li>• Lock monitoring</li>
              <li>• Performance impact</li>
              <li>• Resource usage alerts</li>
              <li>• Error rate monitoring</li>
              <li>• ... and 5 more</li>
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
              <li>• ... and 5 more</li>
            </ul>
          </div>
        </div>

        {/* Key Safety Enhancements */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">🛡️ Safety Enhancements</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Critical safety features that prevent data loss and migration failures.</p>

          <div className="space-y-8">
            {/* Safe NOT NULL Example */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-3">🛡️</span>
                Safe NOT NULL Column Addition
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Prevents migration failures when adding NOT NULL columns to tables with existing data.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-3">❌ Before (Risky)</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-800 dark:text-gray-200">{`ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;`}</code>
                  </pre>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    ⚠️ Fails if table has existing rows without email values
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-green-600 dark:text-green-400 mb-3">✅ After (Safe)</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-800 dark:text-gray-200">{`-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Step 2: Populate with defaults  
UPDATE users SET email = 'pending@example.com' WHERE email IS NULL;

-- Step 3: Apply NOT NULL constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;`}</code>
                  </pre>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    ✅ Safe multi-step approach prevents failures
                  </p>
                </div>
              </div>
            </div>

            {/* Safe Constraint Addition */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-3">🔒</span>
                Safe Constraint Addition
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Adds constraints with NOT VALID first, then validates separately to reduce lock time.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-3">❌ Before (Long Lock)</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-800 dark:text-gray-200">{`ALTER TABLE orders ADD CONSTRAINT fk_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id);`}</code>
                  </pre>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    ⚠️ Long lock while validating all existing data
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-green-600 dark:text-green-400 mb-3">✅ After (Minimal Lock)</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-800 dark:text-gray-200">{`-- Step 1: Add constraint without validation (fast)
ALTER TABLE orders ADD CONSTRAINT fk_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;

-- Step 2: Validate in separate transaction
ALTER TABLE orders VALIDATE CONSTRAINT fk_customer;`}</code>
                  </pre>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    ✅ Minimal lock time with separate validation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Enhancements */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">⚡ Performance Enhancements</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Optimizations that improve migration speed and reduce system impact.</p>

          <div className="grid gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-3">📊</span>
                Concurrent Index Creation
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Creates indexes without blocking table writes, essential for zero-downtime deployments.
              </p>
              <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
                <code className="text-gray-800 dark:text-gray-200">{`-- Flow Enhancement: Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Automatically adds analysis after creation
ANALYZE users;`}</code>
              </pre>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-3">🧹</span>
                Smart Index Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Only suggests indexes that will actually improve performance, preventing database bloat.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">✅ Suggests For:</h4>
                  <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    <li>• Foreign key columns</li>
                    <li>• Query filter columns</li>
                    <li>• Unique constraints</li>
                    <li>• Timestamp columns</li>
                  </ul>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">❌ Warns Against:</h4>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    <li>• Complex composites</li>
                    <li>• Text/blob columns</li>
                    <li>• Redundant indexes</li>
                    <li>• Ineffective patterns</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started CTA */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4">
            🚀 Ready to Get Started?
          </h3>
          <p className="text-blue-700 dark:text-blue-300 mb-6 max-w-2xl mx-auto">
            All these enhancements are applied automatically when you use DriftJS Flow. 
            No manual configuration required - just install and run!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/docs/flow/quick-start" 
              className="inline-flex items-center px-6 py-3 border border-blue-300 dark:border-blue-700 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              📚 Quick Start Guide
            </a>
            <a 
              href="/docs/flow/installation" 
              className="inline-flex items-center px-6 py-3 border border-blue-300 dark:border-blue-700 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              ⚙️ Installation
            </a>
            <a 
              href="/docs/flow/enhance" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🚀 flow enhance command
            </a>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}