/**
 * Index Optimization Speed Enhancement
 * Analyzes and suggests optimizations for database indexes
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'speed-index-optimization',
  name: 'Index Optimization',
  description: 'Analyzes indexes and suggests optimizations like composite indexes, covering indexes, and proper ordering',
  category: 'speed',
  priority: 8,
  requiresConfirmation: true,
  tags: ['index', 'optimization', 'composite', 'covering']
};

class IndexOptimizationDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('create index') || content.includes('add index');
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No index operations detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');
    const indexCount = (content.match(/create index/g) || []).length;

    if (indexCount > 3) {
      issues.push({
        severity: 'medium' as const,
        description: `Multiple indexes being created (${indexCount}) - consider composite indexes`,
        location: 'CREATE INDEX statements',
        line: lines.findIndex(line => line.toLowerCase().includes('create index')) + 1 || 1,
        recommendation: 'Consider combining related single-column indexes into composite indexes'
      });
    }

    return {
      applicable: true,
      confidence: 0.8,
      issues,
      impact: {
        riskReduction: 0,
        performanceImprovement: 0.8,
        complexityAdded: 0.4,
        description: 'Optimizes index strategy for better query performance and reduced storage'
      }
    };
  }
}

class IndexOptimizationApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];
    const lines = content.split('\n');

    // Add optimization suggestions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('create index')) {
        const suggestions = [
          '-- Index optimization suggestions:',
          '-- 1. Consider composite indexes for related columns: (col1, col2)',
          '-- 2. Use covering indexes to include frequently selected columns',
          '-- 3. Order columns by selectivity (most selective first)'
        ];
        
        lines.splice(i, 0, ...suggestions);
        changes.push('Added index optimization suggestions');
        i += suggestions.length; // Skip inserted lines
        break; // Only add once per migration
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

export const indexOptimizationModule: EnhancementModule = {
  enhancement,
  detector: new IndexOptimizationDetector(),
  applicator: new IndexOptimizationApplicator()
}; 