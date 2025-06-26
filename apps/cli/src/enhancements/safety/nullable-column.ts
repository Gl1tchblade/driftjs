/**
 * Nullable Column Safety Enhancement
 * Detects nullable column operations and suggests safer migration patterns
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-nullable-column',
  name: 'Nullable Column Safety',
  description: 'Ensures safe handling of nullable column operations by adding proper NULL checks and default values',
  category: 'safety',
  priority: 6,
  requiresConfirmation: true,
  tags: ['nullable', 'column', 'safety', 'null-checks']
};

class NullableColumnDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return (
      content.includes('alter column') && content.includes('null') ||
      content.includes('not null') ||
      content.includes('set null') ||
      content.includes('drop not null')
    );
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { applicable: false, confidence: 0, issues: [], impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No nullable column operations detected' } };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    if (content.includes('not null') && !content.includes('default')) {
      issues.push({
        severity: 'high' as const,
        description: 'Adding NOT NULL constraint without a default value can fail if table has existing NULL values',
        location: 'ALTER COLUMN ... NOT NULL',
        line: lines.findIndex(line => line.toLowerCase().includes('not null')) + 1,
        recommendation: 'Add a default value or update existing NULL values before applying constraint'
      });
    }

    if (content.includes('drop not null')) {
      issues.push({
        severity: 'medium' as const,
        description: 'Removing NOT NULL constraint without data validation can lead to unexpected NULL values',
        location: 'DROP NOT NULL',
        line: lines.findIndex(line => line.toLowerCase().includes('drop not null')) + 1,
        recommendation: 'Consider if allowing NULL values is intentional and add application-level validation'
      });
    }

    return {
      applicable: true,
      confidence: 0.8,
      issues,
      impact: {
        riskReduction: 0.7,
        performanceImprovement: 0,
        complexityAdded: 0.3,
        description: 'Adds proper NULL handling and validation to column modifications'
      }
    };
  }
}

class NullableColumnApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];

    // Add safety checks for NOT NULL constraints
    if (content.toLowerCase().includes('not null') && !content.toLowerCase().includes('default')) {
      const lines = content.split('\n');
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes('alter column') && line.toLowerCase().includes('not null')) {
          // Add a comment suggesting to check for existing NULL values
          const safetyComment = '  -- Safety check: Ensure no NULL values exist before adding NOT NULL constraint';
          const updateComment = '  -- UPDATE table_name SET column_name = \'default_value\' WHERE column_name IS NULL;';
          lines.splice(i, 0, safetyComment);
          lines.splice(i + 1, 0, updateComment);
          changes.push({
            type: 'ADDED' as const,
            original: line,
            modified: `${safetyComment}\n${updateComment}\n${line}`,
            line: i + 1,
            reason: 'Added safety check comments for NOT NULL constraint'
          });
          i += 2; // Skip the inserted lines
          modified = true;
        }
      }

      if (modified) {
        modifiedContent = lines.join('\n');
      }
    }

    // Add validation for DROP NOT NULL
    if (content.toLowerCase().includes('drop not null')) {
      const lines = content.split('\n');
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes('drop not null')) {
          const intentionComment = '  -- Safety check: Consider if allowing NULL values is intentional';
          const validationComment = '  -- Add application-level validation if needed';
          lines.splice(i, 0, intentionComment);
          lines.splice(i + 1, 0, validationComment);
          changes.push({
            type: 'ADDED' as const,
            original: line,
            modified: `${intentionComment}\n${validationComment}\n${line}`,
            line: i + 1,
            reason: 'Added safety warnings for DROP NOT NULL constraint'
          });
          i += 2;
          modified = true;
        }
      }

      if (modified) {
        modifiedContent = lines.join('\n');
      }
    }

    return {
      enhancement,
      applied: changes.length > 0,
      modifiedContent,
      warnings: changes.length === 0 ? ['No nullable column safety improvements were applied'] : [],
      changes
    };
  }
}

export const nullableColumnModule: EnhancementModule = {
  enhancement,
  detector: new NullableColumnDetector(),
  applicator: new NullableColumnApplicator()
}; 