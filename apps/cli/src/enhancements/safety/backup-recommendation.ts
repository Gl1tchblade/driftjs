/**
 * Backup Recommendation Safety Enhancement
 * Suggests database backups before risky operations
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-backup-recommendation',
  name: 'Backup Recommendation',
  description: 'Recommends taking database backups before executing risky migration operations',
  category: 'safety',
  priority: 9,
  requiresConfirmation: false,
  tags: ['backup', 'safety', 'data-protection', 'risk-mitigation']
};

class BackupRecommendationDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    const riskyOperations = [
      'drop table',
      'drop column',
      'alter column',
      'truncate',
      'delete from',
      'update',
      'drop index',
      'drop constraint'
    ];
    
    return riskyOperations.some(op => content.includes(op));
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No risky operations detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    const riskyOperations = [
      { operation: 'drop table', severity: 'critical', description: 'Dropping tables permanently removes all data' },
      { operation: 'drop column', severity: 'high', description: 'Dropping columns permanently removes data' },
      { operation: 'truncate', severity: 'critical', description: 'Truncating tables removes all data' },
      { operation: 'delete from', severity: 'high', description: 'Mass deletion operations can remove critical data' }
    ];

    for (const op of riskyOperations) {
      if (content.includes(op.operation)) {
        issues.push({
          severity: op.severity as 'critical' | 'high',
          description: op.description,
          location: op.operation.toUpperCase(),
          line: lines.findIndex(line => line.toLowerCase().includes(op.operation)) + 1 || 1,
          recommendation: 'Create a database backup before executing this migration'
        });
      }
    }

    return {
      applicable: true,
      confidence: 0.9,
      issues,
      impact: {
        riskReduction: 0.9,
        performanceImprovement: 0,
        complexityAdded: 0.1,
        description: 'Adds backup recommendations for data safety'
      }
    };
  }
}

class BackupRecommendationApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    const changes = [];
    
    // Add backup recommendation at the top of the migration
    const backupWarning = [
      '-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION',
      '-- This migration contains potentially destructive operations.',
      '-- It is STRONGLY recommended to create a full database backup before proceeding.',
      '-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql',
      '--'
    ].join('\n');

    const modifiedContent = backupWarning + '\n' + content;
    changes.push('Added backup recommendation warning');

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

export const backupRecommendationModule: EnhancementModule = {
  enhancement,
  detector: new BackupRecommendationDetector(),
  applicator: new BackupRecommendationApplicator()
}; 