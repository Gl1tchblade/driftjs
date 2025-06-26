/**
 * Unique Constraint Safety Enhancement
 * Warns about potential issues when adding unique constraints to existing tables
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-unique-constraint',
  name: 'Unique Constraint Safety',
  description: 'Warns about potential issues when adding unique constraints to existing tables with data',
  category: 'safety',
  priority: 7,
  requiresConfirmation: true,
  tags: ['unique', 'constraint', 'safety', 'data-integrity']
};

class UniqueConstraintDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('unique') && (content.includes('constraint') || content.includes('add unique') || content.includes('create unique'));
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No unique constraints detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('add unique') || content.includes('add constraint') && content.includes('unique')) {
      issues.push({
        severity: 'medium' as const,
        description: 'Adding unique constraint to existing table may fail if duplicate values exist',
        location: 'UNIQUE constraint',
        line: lines.findIndex(line => line.toLowerCase().includes('unique')) + 1 || 1,
        recommendation: 'Verify data uniqueness before adding constraint or clean up duplicates first'
      });
    }

    return {
      applicable: true,
      confidence: 0.8,
      issues,
      impact: {
        riskReduction: 0.6,
        performanceImprovement: 0,
        complexityAdded: 0.3,
        description: 'Prevents constraint violation errors during migration'
      }
    };
  }
}

class UniqueConstraintApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('unique') && (line.toLowerCase().includes('constraint') || line.toLowerCase().includes('add unique'))) {
        const warnings = [
          '-- UNIQUE CONSTRAINT WARNING:',
          '-- Ensure no duplicate values exist before adding unique constraint:',
          '-- SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;'
        ];
        
        lines.splice(i, 0, ...warnings);
        changes.push('Added unique constraint safety check');
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
      warnings: changes.length === 0 ? ['No unique constraints found'] : [],
      changes: changes.map(change => ({
        type: 'ADDED' as const,
        original: 'UNIQUE constraint',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const uniqueConstraintModule: EnhancementModule = {
  enhancement,
  detector: new UniqueConstraintDetector(),
  applicator: new UniqueConstraintApplicator()
}; 