/**
 * Column Renaming Safety Enhancement
 * Warns about risks and compatibility issues when renaming columns
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-column-renaming',
  name: 'Column Renaming Safety',
  description: 'Warns about application compatibility risks when renaming database columns',
  category: 'safety',
  priority: 7,
  requiresConfirmation: true,
  tags: ['column', 'rename', 'compatibility', 'breaking-change']
};

class ColumnRenamingDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('rename column') || 
           content.includes('alter column') && content.includes('rename to');
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No column renaming detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('rename column')) {
      issues.push({
        severity: 'high' as const,
        description: 'Renaming columns can break existing application code and queries',
        location: 'RENAME COLUMN operation',
        line: lines.findIndex(line => line.toLowerCase().includes('rename column')) + 1 || 1,
        recommendation: 'Consider a staged approach: add new column, copy data, update application, then drop old column'
      });
    }

    return {
      applicable: true,
      confidence: 0.8,
      issues,
      impact: {
        riskReduction: 0.7,
        performanceImprovement: 0,
        complexityAdded: 0.4,
        description: 'Prevents application breakage from column renames'
      }
    };
  }
}

class ColumnRenamingApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('rename column')) {
        const warnings = [
          '-- ⚠️  COLUMN RENAME WARNING:',
          '-- This operation can break existing application code.',
          '-- Recommended staged approach:',
          '-- 1. Add new column with desired name',
          '-- 2. Copy data from old to new column',
          '-- 3. Update application code to use new column',
          '-- 4. Drop old column in a separate migration'
        ];
        
        lines.splice(i, 0, ...warnings);
        changes.push('Added column renaming safety warning');
        i += warnings.length; // Skip inserted lines
      }
    }

    if (changes.length > 0) {
      modifiedContent = lines.join('\n');
    }

    return {
      enhancement,
      applied: changes.length > 0,
      modifiedContent,
      warnings: changes.length === 0 ? ['No column renaming operations found'] : [],
      changes: changes.map(change => ({
        type: 'ADDED' as const,
        original: 'RENAME COLUMN',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const columnRenamingModule: EnhancementModule = {
  enhancement,
  detector: new ColumnRenamingDetector(),
  applicator: new ColumnRenamingApplicator()
}; 