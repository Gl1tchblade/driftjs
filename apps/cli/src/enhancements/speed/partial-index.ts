/**
 * Partial Index Speed Enhancement
 * Suggests using partial indexes for better performance on filtered queries
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'speed-partial-index',
  name: 'Partial Index Optimization',
  description: 'Suggests partial indexes for columns with selective conditions to improve query performance',
  category: 'speed',
  priority: 6,
  requiresConfirmation: true,
  tags: ['index', 'partial', 'performance', 'selective']
};

class PartialIndexDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('create index') && 
           (content.includes('where') || content.includes('boolean') || content.includes('status'));
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No index creation detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('create index') && !content.includes('where')) {
      if (content.includes('status') || content.includes('active') || content.includes('enabled')) {
        issues.push({
          severity: 'medium' as const,
          description: 'Index on status/boolean columns could benefit from partial indexing',
          location: 'CREATE INDEX',
          line: lines.findIndex(line => line.toLowerCase().includes('create index')) + 1 || 1,
          recommendation: 'Consider using partial index with WHERE clause for selective filtering'
        });
      }
    }

    return {
      applicable: true,
      confidence: 0.7,
      issues,
      impact: {
        riskReduction: 0,
        performanceImprovement: 0.6,
        complexityAdded: 0.3,
        description: 'Reduces index size and improves performance for selective queries'
      }
    };
  }
}

class PartialIndexApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('create index')) {
        // Add suggestion for partial indexes
        const suggestion = '-- Consider partial index: ' + line.trim() + ' WHERE active = true;';
        lines.splice(i + 1, 0, suggestion);
        changes.push('Added partial index suggestion');
        i++; // Skip the inserted line
      }
    }

    if (changes.length > 0) {
      modifiedContent = lines.join('\n');
    }

    return {
      enhancement,
      applied: changes.length > 0,
      modifiedContent,
      warnings: changes.length === 0 ? ['No index optimizations were suggested'] : [],
      changes: changes.map(change => ({
        type: 'ADDED' as const,
        original: 'CREATE INDEX',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const partialIndexModule: EnhancementModule = {
  enhancement,
  detector: new PartialIndexDetector(),
  applicator: new PartialIndexApplicator()
}; 