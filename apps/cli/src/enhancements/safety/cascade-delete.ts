/**
 * Cascade Delete Safety Enhancement
 * Warns about potential risks with CASCADE DELETE operations
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-cascade-delete',
  name: 'Cascade Delete Safety',
  description: 'Warns about CASCADE DELETE operations and suggests safer alternatives',
  category: 'safety',
  priority: 9,
  requiresConfirmation: true,
  tags: ['cascade', 'delete', 'foreign-key', 'safety']
};

class CascadeDeleteDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('on delete cascade') || content.includes('cascade delete');
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No cascade delete operations detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('on delete cascade')) {
      issues.push({
        severity: 'high' as const,
        description: 'CASCADE DELETE can cause unintended data loss across related tables',
        location: 'ON DELETE CASCADE constraint',
        line: lines.findIndex(line => line.toLowerCase().includes('on delete cascade')) + 1 || 1,
        recommendation: 'Consider using ON DELETE RESTRICT or SET NULL with application-level cleanup logic'
      });
    }

    return {
      applicable: true,
      confidence: 0.9,
      issues,
      impact: {
        riskReduction: 0.8,
        performanceImprovement: 0,
        complexityAdded: 0.3,
        description: 'Prevents accidental data loss from cascade deletions'
      }
    };
  }
}

class CascadeDeleteApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('on delete cascade')) {
        const warnings = [
          '-- ⚠️  CASCADE DELETE WARNING:',
          '-- This will automatically delete related records in child tables.',
          '-- Consider safer alternatives:',
          '-- 1. ON DELETE RESTRICT (prevents deletion if child records exist)',
          '-- 2. ON DELETE SET NULL (sets foreign key to NULL)',
          '-- 3. Application-level cleanup logic'
        ];
        
        lines.splice(i, 0, ...warnings);
        changes.push('Added CASCADE DELETE safety warning');
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
      warnings: changes.length === 0 ? ['No cascade delete operations found'] : [],
      changes: changes.map(change => ({
        type: 'ADDED' as const,
        original: 'ON DELETE CASCADE',
        modified: change,
        line: 1,
        reason: change
      }))
    };
  }
}

export const cascadeDeleteModule: EnhancementModule = {
  enhancement,
  detector: new CascadeDeleteDetector(),
  applicator: new CascadeDeleteApplicator()
}; 