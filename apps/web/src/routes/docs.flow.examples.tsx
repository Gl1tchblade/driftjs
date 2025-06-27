import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/flow/examples')({
  component: FlowExamplesDoc,
})

function FlowExamplesDoc() {
  return (
    <div className="prose prose-lg max-w-6xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          📚 Flow Enhancement Examples
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Real-world before & after examples showing Flow's powerful enhancements
        </p>
      </div>

      {/* Table Creation Example */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">🗃️ Table Creation Enhancement</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-red-700 mb-3">❌ Before Enhancement</h3>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto"><code>{`-- Basic table creation
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index (blocks table access)
CREATE INDEX idx_users_email ON users (email);

-- Add constraint without validation
ALTER TABLE users 
ADD CONSTRAINT unique_email UNIQUE (email);`}</code></pre>
            </div>
            
            <div className="mt-3 text-sm">
              <h4 className="font-medium text-red-700 mb-1">⚠️ Issues:</h4>
              <ul className="text-red-600 space-y-1">
                <li>• No transaction safety</li>
                <li>• Blocking index creation</li>
                <li>• No backup recommendation</li>
                <li>• Missing data validation</li>
              </ul>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-green-700 mb-3">✅ After Flow Enhancement</h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto"><code>{`-- Flow Enhancement: Transaction Wrapper
BEGIN;

-- Flow Enhancement: Backup Recommendation
-- Create backup before proceeding with schema changes
-- Run: pg_dump mydb > backup_$(date +%Y%m%d_%H%M%S).sql

-- Table creation with enhanced safety
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Flow Enhancement: Concurrent Index
-- Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_users_email 
ON users (email);

-- Flow Enhancement: Constraint Safety
-- Add constraint with proper validation
ALTER TABLE users 
ADD CONSTRAINT unique_email UNIQUE (email);

-- Flow Enhancement: Data Validation
-- Ensure email format is valid
ALTER TABLE users 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

COMMIT;`}</code></pre>
            </div>
            
            <div className="mt-3 text-sm">
              <h4 className="font-medium text-green-700 mb-1">✅ Improvements:</h4>
              <ul className="text-green-600 space-y-1">
                <li>• Transaction-wrapped for safety</li>
                <li>• Non-blocking concurrent index</li>
                <li>• Backup recommendation added</li>
                <li>• Email format validation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Data Migration Example */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">🔄 Data Migration Enhancement</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-red-700 mb-3">❌ Before Enhancement</h3>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto"><code>{`-- Risky column type change
ALTER TABLE users 
ALTER COLUMN age TYPE INTEGER 
USING age::INTEGER;

-- Multiple individual inserts
INSERT INTO user_roles (user_id, role) VALUES (1, 'admin');
INSERT INTO user_roles (user_id, role) VALUES (2, 'user');
INSERT INTO user_roles (user_id, role) VALUES (3, 'user');
INSERT INTO user_roles (user_id, role) VALUES (4, 'moderator');
INSERT INTO user_roles (user_id, role) VALUES (5, 'user');

-- Dangerous column rename
ALTER TABLE users 
RENAME COLUMN full_name TO name;`}</code></pre>
            </div>
            
            <div className="mt-3 text-sm">
              <h4 className="font-medium text-red-700 mb-1">⚠️ Issues:</h4>
              <ul className="text-red-600 space-y-1">
                <li>• Risky data type conversion</li>
                <li>• Inefficient individual inserts</li>
                <li>• Column rename breaks compatibility</li>
                <li>• No data validation</li>
              </ul>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-green-700 mb-3">✅ After Flow Enhancement</h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto"><code>{`-- Flow Enhancement: Transaction Wrapper
BEGIN;

-- Flow Enhancement: Data Type Change Safety
-- WARNING: Converting VARCHAR to INTEGER may cause data loss
-- Ensure all values in 'age' column are valid integers
-- Consider backing up the table before proceeding

-- Safe type conversion with validation
ALTER TABLE users 
ALTER COLUMN age TYPE INTEGER 
USING CASE 
  WHEN age ~ '^[0-9]+$' THEN age::INTEGER 
  ELSE NULL 
END;

-- Flow Enhancement: Batch Insert Optimization
-- Optimized batch insert for better performance
INSERT INTO user_roles (user_id, role) VALUES 
  (1, 'admin'),
  (2, 'user'),
  (3, 'user'),
  (4, 'moderator'),
  (5, 'user');

-- Flow Enhancement: Column Renaming Safety
-- WARNING: Column rename may break existing applications
-- Consider using a view for backward compatibility
CREATE VIEW users_legacy AS 
SELECT *, name AS full_name FROM users;

-- Safe column rename
ALTER TABLE users 
RENAME COLUMN full_name TO name;

COMMIT;`}</code></pre>
            </div>
            
            <div className="mt-3 text-sm">
              <h4 className="font-medium text-green-700 mb-1">✅ Improvements:</h4>
              <ul className="text-green-600 space-y-1">
                <li>• Safe type conversion with validation</li>
                <li>• Optimized batch insert</li>
                <li>• Backward compatibility view</li>
                <li>• Clear warnings and recommendations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Index Optimization Example */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">🚀 Smart Index Analysis</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-red-700 mb-3">❌ Before Enhancement</h3>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto"><code>{`-- Inefficient index creation
CREATE INDEX idx_posts_content ON posts (content);
CREATE INDEX idx_posts_title ON posts (title);
CREATE INDEX idx_posts_author ON posts (author_id);
CREATE INDEX idx_posts_status ON posts (status);
CREATE INDEX idx_posts_complex ON posts (
  title, content, author_id, status, created_at, tags
);

-- No consideration for query patterns
CREATE INDEX idx_users_description ON users (description);`}</code></pre>
            </div>
            
            <div className="mt-3 text-sm">
              <h4 className="font-medium text-red-700 mb-1">⚠️ Issues:</h4>
              <ul className="text-red-600 space-y-1">
                <li>• Indexing large text columns</li>
                <li>• Overly complex composite index</li>
                <li>• No query pattern analysis</li>
                <li>• Potential index bloat</li>
              </ul>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-green-700 mb-3">✅ After Flow Enhancement</h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto"><code>{`-- Flow Enhancement: Smart Index Analysis
BEGIN;

-- Flow Enhancement: Index Effectiveness Warning
-- WARNING: Indexing large text column 'content' may not be beneficial
-- Consider full-text search or partial index instead
-- SKIPPED: CREATE INDEX idx_posts_content ON posts (content);

-- Flow Enhancement: Concurrent Index Creation
-- Non-blocking index for commonly queried columns
CREATE INDEX CONCURRENTLY idx_posts_title 
ON posts (title);

-- High-priority index for foreign key
CREATE INDEX CONCURRENTLY idx_posts_author 
ON posts (author_id);

-- Beneficial index for status filtering
CREATE INDEX CONCURRENTLY idx_posts_status 
ON posts (status) 
WHERE status IN ('published', 'draft');

-- Flow Enhancement: Composite Index Optimization
-- Simplified composite index based on query patterns
CREATE INDEX CONCURRENTLY idx_posts_author_status_created 
ON posts (author_id, status, created_at DESC);

-- Flow Enhancement: Partial Index Suggestion
-- More efficient partial index for text search
CREATE INDEX CONCURRENTLY idx_users_description_partial 
ON users (description) 
WHERE description IS NOT NULL AND length(description) > 10;

COMMIT;`}</code></pre>
            </div>
            
            <div className="mt-3 text-sm">
              <h4 className="font-medium text-green-700 mb-1">✅ Smart Analysis:</h4>
              <ul className="text-green-600 space-y-1">
                <li>• Skipped inefficient text index</li>
                <li>• Prioritized foreign key indexes</li>
                <li>• Used partial indexes effectively</li>
                <li>• Optimized composite index order</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Migration Example */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">🎯 Complete Migration Enhancement</h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Interactive Enhancement Session</h3>
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
            <div className="text-cyan-400 mb-4">
              ╭───────────────────────────────────────╮<br/>
              │                Flow                   │<br/>
              │  Database Migration Enhancement Tool  │<br/>
              ╰───────────────────────────────────────╯
            </div>
            
            <div className="space-y-1">
              <div className="text-blue-400">●  ℹ️  Operating on: 20240101000001_user_system.sql</div>
              <div className="text-green-400">◇  ✅ Migration file loaded successfully (847 lines)</div>
              
              <div className="text-yellow-400 my-2">●  ━━━ Phase 1: Safety Enhancements ━━━</div>
              <div className="text-orange-400">▲  ⚠️  Found 7 safety issues requiring attention:</div>
              <div className="ml-4 space-y-1 text-sm">
                <div className="text-red-400">• Transaction Wrapper - Missing transaction boundaries</div>
                <div className="text-orange-400">• Drop Table Safeguard - Unsafe DROP operations detected</div>
                <div className="text-yellow-400">• Data Type Change Safety - Risky type conversions found</div>
                <div className="text-orange-400">• Cascade Delete Safety - Dangerous CASCADE operations</div>
                <div className="text-yellow-400">• Column Renaming Safety - Breaking column renames</div>
                <div className="text-red-400">• Backup Recommendation - Critical data operations</div>
                <div className="text-orange-400">• Migration Order Safety - Operation sequence issues</div>
              </div>
              
              <div className="text-green-400 my-2">◇  Apply recommended safety enhancements? Yes</div>
              <div className="text-green-400">◇  ✅ Safety enhancements applied successfully</div>
              
              <div className="text-yellow-400 my-2">●  ━━━ Phase 2: Speed Enhancements ━━━</div>
              <div className="text-blue-400">◇  ℹ️  Analyzing indexes for effectiveness...</div>
              <div className="text-green-400">◇  ✅ Found 4 beneficial optimizations:</div>
              <div className="ml-4 space-y-1 text-sm">
                <div className="text-green-400">• Concurrent Index - 3 indexes can be created non-blocking</div>
                <div className="text-blue-400">• Batch Insert - 2 INSERT sections can be optimized</div>
                <div className="text-cyan-400">• Partial Index - 1 index benefits from WHERE clause</div>
                <div className="text-yellow-400">• Index Skipped - 2 ineffective indexes removed</div>
              </div>
              
              <div className="text-green-400">◇  Apply speed enhancements? Yes</div>
              <div className="text-green-400">◇  ✅ Speed enhancements applied successfully</div>
              
              <div className="text-green-400 my-3">
                ◆  ✅ ✨ Enhancement process completed!<br/>
                ●     📊 Summary:<br/>
                ●        • Safety improvements: 7 applied<br/>
                ●        • Performance optimizations: 4 applied<br/>
                ●        • Risk reduction: High<br/>
                ●        • Performance gain: +35%<br/>
                ●        • Enhanced file: user_system.enhanced.sql<br/>
                └  Ready for deployment! 🚀
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Examples */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">🔗 Integration Examples</h2>
        
        <div className="space-y-8">
          {/* GitHub Actions */}
          <div>
            <h3 className="text-xl font-semibold mb-4">GitHub Actions Workflow</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <span className="text-gray-500"># .github/workflows/database-migrations.yml</span><br/>
              <span className="text-blue-400">name:</span> Database Migration Enhancement<br/>
              <span className="text-blue-400">on:</span><br/>
              <span className="ml-2">- push</span><br/>
              <span className="ml-2">- pull_request</span><br/>
              <br/>
              <span className="text-blue-400">jobs:</span><br/>
              <span className="ml-2 text-blue-400">enhance-migrations:</span><br/>
              <span className="ml-4 text-blue-400">runs-on:</span> ubuntu-latest<br/>
              <span className="ml-4 text-blue-400">steps:</span><br/>
              <span className="ml-6">- <span className="text-blue-400">uses:</span> actions/checkout@v3</span><br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Setup Node.js</span><br/>
              <span className="ml-8 text-blue-400">uses:</span> actions/setup-node@v3<br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Install Flow CLI</span><br/>
              <span className="ml-8 text-blue-400">run:</span> npm install -g @driftjs/flow<br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Validate Migrations</span><br/>
              <span className="ml-8 text-blue-400">run:</span> flow validate --all --strict<br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Plan Enhancements</span><br/>
              <span className="ml-8 text-blue-400">run:</span> flow plan --output enhancement-plan.json<br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Apply Enhancements</span><br/>
              <span className="ml-8 text-blue-400">run:</span> flow enhance --force<br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Generate Report</span><br/>
              <span className="ml-8 text-blue-400">run:</span> flow status --export migration-report.json
            </div>
          </div>

          {/* Package.json Scripts */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Package.json Scripts</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <span className="text-gray-500">// package.json</span><br/>
              <span className="text-blue-400">"scripts":</span> {'{'}<br/>
              <span className="ml-2 text-yellow-400">"db:init":</span> <span className="text-green-400">"flow init"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:enhance":</span> <span className="text-green-400">"flow enhance"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:enhance:dry":</span> <span className="text-green-400">"flow enhance --dry-run"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:validate":</span> <span className="text-green-400">"flow validate --all"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:plan":</span> <span className="text-green-400">"flow plan --verbose"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:status":</span> <span className="text-green-400">"flow status --detailed"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:rollback":</span> <span className="text-green-400">"flow rollback"</span>,<br/>
              <span className="ml-2 text-yellow-400">"precommit:db":</span> <span className="text-green-400">"flow validate && flow plan"</span><br/>
              {'}'}
            </div>
          </div>

          {/* Docker Integration */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Docker Integration</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <span className="text-gray-500"># Dockerfile</span><br/>
              <span className="text-blue-400">FROM</span> node:18-alpine<br/>
              <br/>
              <span className="text-gray-500"># Install Flow CLI</span><br/>
              <span className="text-blue-400">RUN</span> npm install -g @driftjs/flow<br/>
              <br/>
              <span className="text-gray-500"># Copy migration files</span><br/>
              <span className="text-blue-400">COPY</span> migrations/ /app/migrations/<br/>
              <span className="text-blue-400">COPY</span> flow.config.json /app/<br/>
              <br/>
              <span className="text-gray-500"># Set working directory</span><br/>
              <span className="text-blue-400">WORKDIR</span> /app<br/>
              <br/>
              <span className="text-gray-500"># Enhance and run migrations</span><br/>
              <span className="text-blue-400">RUN</span> flow enhance --force<br/>
              <span className="text-blue-400">CMD</span> ["flow", "status", "--detailed"]
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 