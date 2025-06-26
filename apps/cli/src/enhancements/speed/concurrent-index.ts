/**
 * Concurrent Index Creation Enhancement
 * 
 * Modifies CREATE INDEX operations to use CONCURRENT option, allowing index creation 
 * without blocking reads/writes. Also analyzes whether indexes are actually beneficial.
 */

import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';
import pkg from 'node-sql-parser';
const { Parser } = pkg;
import { EnhancementChange, EnhancementIssue } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'speed-concurrent-index',
  name: 'Concurrent Index Creation',
  description: 'Modifies CREATE INDEX operations to use CONCURRENT option, allowing index creation without blocking reads/writes',
  category: 'speed',
  priority: 8,
  requiresConfirmation: false,
  tags: ['index', 'concurrent', 'performance', 'non-blocking']
};

export const concurrentIndexDetector: EnhancementDetector = {
  async detect(migration: MigrationFile): Promise<boolean> {
    const parser = new Parser();
    
    try {
      const ast = parser.astify(migration.up, { database: 'postgresql' });
      const statements = Array.isArray(ast) ? ast : [ast];
      
      return statements.some(stmt => 
        stmt.type === 'create' && 
        stmt.keyword === 'index' &&
        !migration.up.toLowerCase().includes('concurrently') // Only if not already concurrent
      );
    } catch (error) {
      // Fallback to regex if SQL parsing fails
      return /create\s+index/i.test(migration.up) && 
             !/create\s+index\s+concurrently/i.test(migration.up);
    }
  },

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const parser = new Parser();
    const issues: EnhancementIssue[] = [];
    
    try {
      const ast = parser.astify(migration.up, { database: 'postgresql' });
      const statements = Array.isArray(ast) ? ast : [ast];
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        
        if (stmt.type === 'create' && stmt.keyword === 'index') {
          const indexName = stmt.index || 'unnamed_index';
          
          // Smart analysis: Check if this is a good candidate for indexing
          const analysis = await analyzeIndexEffectiveness(stmt, migration);
          
          if (analysis.shouldIndex) {
            const isConcurrent = migration.up.toLowerCase().includes('concurrently');
            
            if (!isConcurrent) {
              issues.push({
                line: i + 1,
                description: `Index "${indexName}" creation will block table access during creation`,
                recommendation: analysis.recommendation,
                severity: analysis.priority === 'high' ? 'critical' : 'medium',
                location: `CREATE INDEX ${indexName}`
              });
            }
          } else {
            // Suggest removing unnecessary index
            issues.push({
              line: i + 1,
              description: `Index "${indexName}" may not be beneficial: ${analysis.reason}`,
              recommendation: `Consider removing this index or reviewing if it's truly needed`,
              severity: 'low',
              location: `CREATE INDEX ${indexName}`
            });
          }
        }
      }
    } catch (error) {
      // Fallback regex analysis
      const lines = migration.up.split('\n');
      lines.forEach((line, index) => {
        if (/create\s+index/i.test(line) && !/concurrently/i.test(line)) {
          const indexMatch = line.match(/create\s+index\s+(\w+)/i);
          const indexName = indexMatch?.[1] || 'unknown';
          
          issues.push({
            line: index + 1,
            description: `Index "${indexName}" creation will block table access during creation`,
            recommendation: 'Use CONCURRENT option to allow non-blocking index creation',
            severity: 'medium',
            location: `CREATE INDEX ${indexName}`
          });
        }
      });
    }
    
    return {
      applicable: issues.length > 0,
      confidence: issues.length > 0 ? 0.8 : 0,
      issues,
      impact: {
        riskReduction: 0.3,
        performanceImprovement: 0.7,
        complexityAdded: 0.1,
        description: 'Analyzes CREATE INDEX operations for blocking behavior and effectiveness'
      }
    };
  }
};

export const concurrentIndexApplicator: EnhancementApplicator = {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    const parser = new Parser();
    let modifiedContent = content;
    const changes: EnhancementChange[] = [];
    
    try {
      const ast = parser.astify(content, { database: 'postgresql' });
      const statements = Array.isArray(ast) ? ast : [ast];
      
      let hasChanges = false;
      
      for (const stmt of statements) {
        if (stmt.type === 'create' && stmt.keyword === 'index') {
          const analysis = await analyzeIndexEffectiveness(stmt, migration);
          
          // Only apply concurrent enhancement if index is actually beneficial
          if (analysis.shouldIndex && !content.toLowerCase().includes('concurrently')) {
            // Add CONCURRENTLY keyword
            const originalLine = modifiedContent.match(/CREATE\s+INDEX\s+[^\n]*/gi)?.[0] || '';
            modifiedContent = modifiedContent.replace(
              /CREATE\s+INDEX\s+/gi,
              'CREATE INDEX CONCURRENTLY '
            );
            hasChanges = true;
            
            changes.push({
              type: 'MODIFIED',
              original: originalLine,
              modified: originalLine.replace(/CREATE\s+INDEX\s+/gi, 'CREATE INDEX CONCURRENTLY '),
              line: 1,
              reason: 'Made index creation concurrent for better performance'
            });
          }
        }
      }
      
      return {
        enhancement,
        applied: hasChanges,
        modifiedContent,
        changes,
        warnings: []
      };
    } catch (error) {
      // Fallback regex replacement
      const originalContent = modifiedContent;
      const lines = modifiedContent.split('\n');
      const modifiedLines: string[] = [];
      
      lines.forEach((line, index) => {
        if (/CREATE\s+INDEX\s+/gi.test(line) && !/CONCURRENTLY/i.test(line)) {
          const modifiedLine = line.replace(/CREATE\s+INDEX\s+/gi, 'CREATE INDEX CONCURRENTLY ');
          modifiedLines.push(modifiedLine);
          
          changes.push({
            type: 'MODIFIED',
            original: line,
            modified: modifiedLine,
            line: index + 1,
            reason: 'Added CONCURRENTLY to index creation'
          });
        } else {
          modifiedLines.push(line);
        }
      });
      
      const hasChanges = changes.length > 0;
      
      return {
        enhancement,
        applied: hasChanges,
        modifiedContent: hasChanges ? modifiedLines.join('\n') : originalContent,
        changes,
        warnings: []
      };
    }
  }
};

/**
 * Analyzes whether an index is actually beneficial and should be created
 */
async function analyzeIndexEffectiveness(indexStmt: any, migration: MigrationFile): Promise<{
  shouldIndex: boolean;
  reason: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}> {
  // Extract column information from the index statement
  const columns = extractIndexColumns(indexStmt);
  const tableName = extractTableName(indexStmt);
  
  // Smart analysis rules
  
  // 1. Check for foreign key columns (almost always beneficial)
  if (columns.some(col => col.includes('_id') || col.includes('Id'))) {
    return {
      shouldIndex: true,
      reason: 'Foreign key column detected',
      recommendation: 'Use CONCURRENT option to allow non-blocking index creation',
      priority: 'high'
    };
  }
  
  // 2. Check for commonly queried columns
  const commonQueryColumns = ['email', 'username', 'status', 'created_at', 'updated_at'];
  if (columns.some(col => commonQueryColumns.includes(col.toLowerCase()))) {
    return {
      shouldIndex: true,
      reason: 'Common query column detected',
      recommendation: 'Use CONCURRENT option to allow non-blocking index creation',
      priority: 'medium'
    };
  }
  
  // 3. Check for unique indexes (usually beneficial)
  if (indexStmt.unique || migration.up.toLowerCase().includes('unique index')) {
    return {
      shouldIndex: true,
      reason: 'Unique constraint index',
      recommendation: 'Use CONCURRENT option to allow non-blocking index creation',
      priority: 'high'
    };
  }
  
  // 4. Check for multiple columns (composite indexes need careful analysis)
  if (columns.length > 3) {
    return {
      shouldIndex: false,
      reason: 'Complex composite index may not be efficient',
      recommendation: 'Review if all columns are needed, consider separate indexes',
      priority: 'low'
    };
  }
  
  // 5. Check for text/blob columns (usually not beneficial for full indexing)
  if (columns.some(col => col.toLowerCase().includes('text') || col.toLowerCase().includes('description'))) {
    return {
      shouldIndex: false,
      reason: 'Text/blob columns are not efficient for regular indexing',
      recommendation: 'Consider partial index or full-text search instead',
      priority: 'medium'
    };
  }
  
  // Default: proceed with caution
  return {
    shouldIndex: true,
    reason: 'Standard index',
    recommendation: 'Use CONCURRENT option to allow non-blocking index creation',
    priority: 'low'
  };
}

/**
 * Extract column names from index statement
 */
function extractIndexColumns(indexStmt: any): string[] {
  if (!indexStmt.on) return [];
  
  try {
    // Handle different AST structures
    if (Array.isArray(indexStmt.on)) {
      return indexStmt.on.map((col: any) => col.column || col.name || String(col));
    }
    
    if (indexStmt.on.column) {
      return [indexStmt.on.column];
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Extract table name from index statement
 */
function extractTableName(indexStmt: any): string {
  try {
    return indexStmt.table?.table || indexStmt.table?.name || 'unknown_table';
  } catch (error) {
    return 'unknown_table';
  }
}

export const concurrentIndexModule: EnhancementModule = {
  enhancement,
  detector: concurrentIndexDetector,
  applicator: concurrentIndexApplicator
}; 