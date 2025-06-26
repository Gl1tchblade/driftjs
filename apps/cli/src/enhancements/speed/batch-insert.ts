/**
 * Batch Insert Speed Enhancement
 * Optimizes multiple INSERT statements by converting them to batch operations
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'speed-batch-insert',
  name: 'Batch Insert Optimization',
  description: 'Converts multiple INSERT statements into efficient batch INSERT operations',
  category: 'speed',
  priority: 7,
  requiresConfirmation: false,
  tags: ['insert', 'batch', 'performance', 'optimization']
};

class BatchInsertDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    const insertMatches = content.match(/insert\s+into/g);
    return !!(insertMatches && insertMatches.length > 3); // More than 3 insert statements
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No multiple INSERT operations detected' } 
      };
    }

    const content = migration.up.toLowerCase();
    const insertCount = (content.match(/insert\s+into/g) || []).length;
    const lines = migration.up.split('\n');

    const issues = [];
    if (insertCount > 5) {
      issues.push({
        severity: 'medium' as const,
        description: `Found ${insertCount} separate INSERT statements that could be batched`,
        location: 'Multiple INSERT statements',
        line: lines.findIndex(line => line.toLowerCase().includes('insert into')) + 1 || 1,
        recommendation: 'Consider using batch INSERT with VALUES (...), (...), (...) syntax for better performance'
      });
    }

    return {
      applicable: true,
      confidence: 0.8,
      issues,
      impact: {
        riskReduction: 0,
        performanceImprovement: 0.7,
        complexityAdded: 0.2,
        description: 'Significantly improves INSERT performance by batching operations'
      }
    };
  }
}

class BatchInsertApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];

    // Find groups of INSERT statements for the same table
    const lines = content.split('\n');
    const insertGroups: { [table: string]: { lines: number[], values: string[] } } = {};

    // Parse INSERT statements
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const insertMatch = line.match(/INSERT\s+INTO\s+(\w+)\s*\([^)]+\)\s*VALUES\s*\(([^)]+)\)/i);
      
      if (insertMatch) {
        const table = insertMatch[1];
        const values = insertMatch[2];
        
        if (!insertGroups[table]) {
          insertGroups[table] = { lines: [], values: [] };
        }
        
        insertGroups[table].lines.push(i);
        insertGroups[table].values.push(`(${values})`);
      }
    }

    // Convert groups with multiple inserts to batch operations
    for (const [table, group] of Object.entries(insertGroups)) {
      if (group.lines.length > 2) {
        // Create batch insert
        const firstLine = lines[group.lines[0]];
        const tableMatch = firstLine.match(/INSERT\s+INTO\s+\w+\s*\([^)]+\)/i);
        
        if (tableMatch) {
          const batchInsert = `${tableMatch[0]} VALUES\n  ${group.values.join(',\n  ')};`;
          
          // Replace first insert with batch insert
          lines[group.lines[0]] = `-- Optimized batch insert for ${table}`;
          lines.splice(group.lines[0] + 1, 0, batchInsert);
          
          // Remove other individual inserts (in reverse order to maintain indices)
          for (let i = group.lines.length - 1; i > 0; i--) {
            lines[group.lines[i]] = `-- Merged into batch insert above`;
          }
          
          changes.push(`Converted ${group.lines.length} individual INSERTs into batch INSERT for table ${table}`);
        }
      }
    }

    if (changes.length > 0) {
      modifiedContent = lines.join('\n');
    }

    return {
      enhancement,
      applied: changes.length > 0,
      modifiedContent,
      warnings: changes.length === 0 ? ['No INSERT statements were optimized for batching'] : [],
      changes: changes.map(change => ({
        type: 'MODIFIED' as const,
        original: 'Multiple INSERT statements',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const batchInsertModule: EnhancementModule = {
  enhancement,
  detector: new BatchInsertDetector(),
  applicator: new BatchInsertApplicator()
}; 