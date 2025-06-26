/**
 * Drop Table Safeguard Safety Enhancement
 * Adds safeguards and warnings for DROP TABLE operations
 */

import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-drop-table-safeguard',
  name: 'Drop Table Safeguard',
  description: 'Adds explicit confirmations and backup recommendations for DROP TABLE operations to prevent accidental data loss',
  category: 'safety',
  priority: 10,
  requiresConfirmation: true,
  tags: ['drop-table', 'data-protection', 'backup', 'critical']
};

class DropTableSafeguardDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return content.includes('drop table');
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
          description: 'No DROP TABLE operations found'
        }
      };
    }

    const issues: import('../../core/types.js').EnhancementIssue[] = [];
    const lines = migration.up.split('\n');
    
    lines.forEach((line, index) => {
      if (/drop\s+table/i.test(line)) {
        const tableName = this.extractTableName(line);
        issues.push({
          severity: 'critical' as const,
          description: `DROP TABLE operation on table "${tableName}" - IRREVERSIBLE DATA LOSS`,
          location: line.trim(),
          line: index + 1,
          recommendation: 'Ensure you have a backup and consider using a different approach if possible'
        });
      }
    });

    return {
      applicable: true,
      confidence: 1.0,
      issues,
      impact: {
        riskReduction: 0.9,
        performanceImprovement: 0,
        complexityAdded: 0.2,
        description: 'Adds explicit warnings and safeguards to prevent accidental data loss from DROP TABLE operations'
      }
    };
  }

  private extractTableName(line: string): string {
    const match = line.match(/drop\s+table\s+(?:if\s+exists\s+)?`?([^`\s;]+)`?/i);
    return match ? match[1] : 'unknown';
  }
}

class DropTableSafeguardApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    try {
      const lines = content.split('\n');
      const modifiedLines: string[] = [];
      const changes: import('../../core/types.js').EnhancementChange[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (/drop\s+table/i.test(line)) {
          const tableName = this.extractTableName(line);
          
          // Add safeguard comments before the DROP TABLE
          const safeguardComment = `-- ⚠️  CRITICAL WARNING: DROP TABLE OPERATION
-- Table: ${tableName}
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Original command: ${line.trim()}`;

          modifiedLines.push(safeguardComment);
          
          // Modify the DROP TABLE to use IF EXISTS for safety
          const saferDropCommand = line.replace(/drop\s+table\s+/i, 'DROP TABLE IF EXISTS ');
          modifiedLines.push(saferDropCommand);
          
          changes.push({
            type: 'MODIFIED' as const,
            original: line,
            modified: safeguardComment + '\n' + saferDropCommand,
            line: i + 1,
            reason: 'Added safety warnings and IF EXISTS clause to DROP TABLE operation'
          });
        } else {
          modifiedLines.push(line);
        }
      }

      return {
        enhancement,
        applied: true,
        modifiedContent: modifiedLines.join('\n'),
        warnings: [
          'DROP TABLE operations detected - please verify you have backups',
          'Added IF EXISTS clauses to prevent errors if tables don\'t exist'
        ],
        changes
      };
    } catch (error) {
      return {
        enhancement,
        applied: false,
        modifiedContent: content,
        warnings: [`Failed to apply drop table safeguard: ${error instanceof Error ? error.message : 'Unknown error'}`],
        changes: []
      };
    }
  }

  private extractTableName(line: string): string {
    const match = line.match(/drop\s+table\s+(?:if\s+exists\s+)?`?([^`\s;]+)`?/i);
    return match ? match[1] : 'unknown';
  }
}

export const dropTableSafeguardModule: EnhancementModule = {
  enhancement,
  detector: new DropTableSafeguardDetector(),
  applicator: new DropTableSafeguardApplicator()
}; 