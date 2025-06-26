/**
 * Data Type Change Safety Enhancement
 * Detects risky data type conversions and suggests safer approaches
 */
import { MigrationFile, Enhancement, EnhancementResult, EnhancementDetector, EnhancementApplicator, EnhancementAnalysis, EnhancementModule } from '../../core/types.js';

const enhancement: Enhancement = {
  id: 'safety-data-type-change',
  name: 'Data Type Change Safety',
  description: 'Detects risky data type conversions and suggests safer migration patterns',
  category: 'safety',
  priority: 8,
  requiresConfirmation: true,
  tags: ['data-type', 'conversion', 'safety', 'column-alteration']
};

class DataTypeChangeDetector implements EnhancementDetector {
  async detect(migration: MigrationFile): Promise<boolean> {
    const content = migration.up.toLowerCase();
    return (
      content.includes('alter column') && content.includes('type') ||
      content.includes('alter table') && content.includes('alter column') ||
      content.includes('change column')
    );
  }

  async analyze(migration: MigrationFile): Promise<EnhancementAnalysis> {
    const applicable = await this.detect(migration);
    if (!applicable) {
      return { 
        applicable: false, 
        confidence: 0, 
        issues: [], 
        impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: 'No data type changes detected' } 
      };
    }

    const issues = [];
    const content = migration.up.toLowerCase();
    const lines = migration.up.split('\n');

    // Check for potentially risky data type conversions
    const riskyConversions = [
      { from: 'varchar', to: 'int', risk: 'high' },
      { from: 'text', to: 'varchar', risk: 'medium' },
      { from: 'decimal', to: 'int', risk: 'high' },
      { from: 'timestamp', to: 'date', risk: 'medium' }
    ];

    for (const conversion of riskyConversions) {
      if (content.includes(conversion.to)) {
        issues.push({
          severity: conversion.risk as 'high' | 'medium',
          description: `Converting to ${conversion.to} may cause data loss or conversion errors`,
          location: 'ALTER COLUMN ... TYPE',
          line: lines.findIndex(line => line.toLowerCase().includes('type')) + 1 || 1,
          recommendation: `Verify data compatibility before converting to ${conversion.to} type`
        });
      }
    }

    return {
      applicable: true,
      confidence: 0.8,
      issues,
      impact: {
        riskReduction: 0.7,
        performanceImprovement: 0,
        complexityAdded: 0.4,
        description: 'Adds safety checks and warnings for risky data type conversions'
      }
    };
  }
}

class DataTypeChangeApplicator implements EnhancementApplicator {
  async apply(content: string, migration: MigrationFile): Promise<EnhancementResult> {
    let modifiedContent = content;
    const changes = [];

    // Add safety comments for data type changes
    if (content.toLowerCase().includes('alter column') && content.toLowerCase().includes('type')) {
      const lines = content.split('\n');
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes('alter column') && line.toLowerCase().includes('type')) {
          lines.splice(i, 0, '  -- Safety check: Verify data compatibility before type conversion');
          lines.splice(i + 1, 0, '  -- Consider backing up data or using a staged migration approach');
          changes.push('Added data type conversion safety comments');
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
      warnings: changes.length === 0 ? ['No data type change safety improvements were applied'] : [],
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

export const dataTypeChangeModule: EnhancementModule = {
  enhancement,
  detector: new DataTypeChangeDetector(),
  applicator: new DataTypeChangeApplicator()
}; 