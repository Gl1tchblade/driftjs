/**
 * Transaction Wrapper Safety Enhancement
 * Wraps unsafe operations in database transactions for better safety
 */

import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-transaction-wrapper',
  name: 'Transaction Wrapper',
  description: 'Wraps migration operations in database transactions to ensure atomicity and enable rollback on failure',
  category: 'safety',
  priority: 9,
  requiresConfirmation: false,
  tags: ['transaction', 'atomicity', 'rollback', 'critical']
};

class TransactionWrapperDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    // Check if migration content doesn't already have explicit transaction handling
    const content = migration.up.toLowerCase();
    
    // Skip if already has transaction commands
    if (content.includes('begin') || content.includes('start transaction') || content.includes('commit')) {
      return false;
    }
    
    // Apply to migrations with potentially risky operations
    const riskyOperations = [
      'drop table',
      'drop column',
      'alter table',
      'delete from',
      'update ',
      'create index',
      'drop index'
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
        impact: {
          riskReduction: 0,
          performanceImprovement: 0,
          complexityAdded: 0,
          description: 'Transaction wrapper not applicable - migration already has transaction handling or no risky operations'
        }
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    
    if (content.includes('drop table')) {
      issues.push({
        severity: 'high' as const,
        description: 'DROP TABLE operation without transaction protection',
        location: 'DROP TABLE statement',
        line: this.findLineNumber(migration.up, /drop\s+table/i),
        recommendation: 'Wrap in transaction to enable rollback if migration fails'
      });
    }
    
    if (content.includes('alter table')) {
      issues.push({
        severity: 'medium' as const,
        description: 'ALTER TABLE operation without transaction protection',
        location: 'ALTER TABLE statement',
        line: this.findLineNumber(migration.up, /alter\s+table/i),
        recommendation: 'Wrap in transaction to ensure consistency'
      });
    }

    return {
      applicable: true,
      confidence: 0.9,
      issues,
      impact: {
        riskReduction: 0.8,
        performanceImprovement: 0,
        complexityAdded: 0.1,
        description: 'Significantly reduces risk by enabling rollback on failure with minimal complexity added'
      }
    };
  }

  private findLineNumber(content: string, pattern: RegExp): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return 1;
  }
}

class TransactionWrapperApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    try {
      // Add transaction wrapper around the migration content
      const modifiedContent = `-- Flow Enhancement: Transaction Wrapper
-- Wraps migration in transaction for safety and rollback capability
BEGIN;

${content.trim()}

COMMIT;

-- If any statement fails, the entire transaction will be rolled back automatically`;

      return {
        enhancement,
        applied: true,
        modifiedContent,
        warnings: [],
        changes: [
          {
            type: 'WRAPPED',
            original: content.trim(),
            modified: modifiedContent,
            line: 1,
            reason: 'Wrapped entire migration in transaction for safety'
          }
        ]
      };
    } catch (error) {
      return {
        enhancement,
        applied: false,
        modifiedContent: content,
        warnings: [`Failed to apply transaction wrapper: ${error instanceof Error ? error.message : 'Unknown error'}`],
        changes: []
      };
    }
  }
}

export const transactionWrapperModule: EnhancementModule = {
  enhancement,
  detector: new TransactionWrapperDetector(),
  applicator: new TransactionWrapperApplicator()
}; 