/**
 * Migration Order Safety Enhancement
 * Checks for potential issues with the order of operations in migrations
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-migration-order',
  name: 'Migration Order Safety',
  description: 'Checks for potential issues with the order of operations in migrations',
  category: 'safety',
  priority: 8,
  requiresConfirmation: false,
  tags: ['order', 'sequence', 'dependencies', 'safety']
};

class MigrationOrderDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return (content.includes('drop') && content.includes('create')) ||
           (content.includes('alter') && content.includes('add')) ||
           (content.includes('insert') && content.includes('create'));
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No order-sensitive operations detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('insert') && content.includes('create table')) {
      const insertIndex = lines.findIndex(line => line.toLowerCase().includes('insert'));
      const createIndex = lines.findIndex(line => line.toLowerCase().includes('create table'));
      
      if (insertIndex >= 0 && createIndex >= 0 && insertIndex < createIndex) {
        issues.push({
          severity: 'high' as const,
          description: 'INSERT statement appears before CREATE TABLE - this will cause an error',
          location: 'INSERT before CREATE TABLE',
          line: insertIndex + 1,
          recommendation: 'Move CREATE TABLE statements before INSERT statements'
        });
      }
    }

    return {
      applicable: true,
      confidence: 0.7,
      issues,
      impact: {
        riskReduction: 0.6,
        performanceImprovement: 0,
        complexityAdded: 0.2,
        description: 'Prevents migration failures due to incorrect operation ordering'
      }
    };
  }
}

class MigrationOrderApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];

    const orderingGuideline = [
      '-- MIGRATION ORDER GUIDELINES:',
      '-- 1. CREATE statements (tables, indexes) first',
      '-- 2. ALTER statements (modify existing structures)',
      '-- 3. INSERT/UPDATE statements (data operations)',
      '-- 4. DROP statements (remove structures) last',
      '--'
    ].join('\n');

    modifiedContent = orderingGuideline + '\n' + content;
    changes.push('Added migration order guidelines');

    return {
      enhancement,
      applied: true,
      modifiedContent,
      warnings: [],
      changes: changes.map(change => ({
        type: 'ADDED' as const,
        original: '',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const migrationOrderModule: EnhancementModule = {
  enhancement,
  detector: new MigrationOrderDetector(),
  applicator: new MigrationOrderApplicator()
}; 