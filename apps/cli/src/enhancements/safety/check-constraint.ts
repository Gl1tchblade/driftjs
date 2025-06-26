/**
 * Check Constraint Safety Enhancement
 * Warns about potential issues when adding check constraints
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-check-constraint',
  name: 'Check Constraint Safety',
  description: 'Warns about potential issues when adding check constraints to existing tables',
  category: 'safety',
  priority: 6,
  requiresConfirmation: true,
  tags: ['check', 'constraint', 'validation', 'safety']
};

class CheckConstraintDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('check') && content.includes('constraint');
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No check constraints detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('add constraint') && content.includes('check')) {
      issues.push({
        severity: 'medium' as const,
        description: 'Adding check constraint to existing table may fail if data violates the constraint',
        location: 'CHECK constraint',
        line: lines.findIndex(line => line.toLowerCase().includes('check')) + 1 || 1,
        recommendation: 'Verify existing data meets constraint requirements before adding'
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

class CheckConstraintApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('check') && line.toLowerCase().includes('constraint')) {
        const warnings = [
          '-- CHECK CONSTRAINT WARNING:',
          '-- Verify existing data meets constraint requirements:',
          '-- SELECT * FROM table_name WHERE NOT (constraint_condition);'
        ];
        
        lines.splice(i, 0, ...warnings);
        changes.push('Added check constraint validation warning');
        i += warnings.length;
      }
    }

    if (changes.length > 0) {
      modifiedContent = lines.join('\n');
    }

    return {
      enhancement,
      applied: changes.length > 0,
      modifiedContent,
      warnings: changes.length === 0 ? ['No check constraints found'] : [],
      changes: changes.map(change => ({
        type: 'ADDED' as const,
        original: 'CHECK constraint',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const checkConstraintModule: EnhancementModule = {
  enhancement,
  detector: new CheckConstraintDetector(),
  applicator: new CheckConstraintApplicator()
}; 