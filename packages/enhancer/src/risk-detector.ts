/**
 * SQL Risk Detection System
 * Identifies blocking operations, destructive operations, performance impacts, and downtime-causing operations
 */

import { DatabaseConnection, TableMetadata } from '@driftjs/core'

export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number // 0-100
  riskCategories: RiskCategory[]
  mitigationStrategies: string[]
  warnings: string[]
  blockers: string[]
}

export interface RiskCategory {
  type: 'BLOCKING' | 'DESTRUCTIVE' | 'PERFORMANCE' | 'CONSTRAINT' | 'DOWNTIME'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  affectedObjects: string[]
  estimatedImpact: {
    lockDuration?: number // seconds
    downtime?: number // seconds
    dataLoss?: boolean
    rollbackDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE'
  }
}

export class SQLRiskDetector {
  constructor(private dbConnection?: DatabaseConnection) {}
  
  /**
   * Ultra-fast SQL risk analysis using pattern matching and caching
   */
  async analyzeSQL(sql: string, tableMetadata?: TableMetadata[]): Promise<RiskAssessment> {
    // Ultra-fast pattern-based analysis instead of complex parsing
    const sqlLower = sql.toLowerCase()
    const riskCategories: RiskCategory[] = []
    const mitigationStrategies: string[] = []
    const warnings: string[] = []
    const blockers: string[] = []
    
    // Lightning-fast pattern matching for common risks
    const riskPatterns = this.getUltraFastRiskPatterns()
    
    for (const pattern of riskPatterns) {
      if (pattern.regex.test(sqlLower)) {
        riskCategories.push(pattern.risk)
        mitigationStrategies.push(...pattern.mitigations)
        if (pattern.isBlocker) blockers.push(pattern.risk.description)
        if (pattern.isWarning) warnings.push(pattern.risk.description)
      }
    }
    
    const riskScore = this.calculateRiskScore(riskCategories)
    const riskLevel = this.determineRiskLevel(riskScore)
    
    return {
      riskLevel,
      riskScore,
      riskCategories,
      mitigationStrategies: [...new Set(mitigationStrategies)],
      warnings: [...new Set(warnings)],
      blockers: [...new Set(blockers)]
    }
  }

  /**
   * Ultra-fast risk pattern matching for instant analysis
   */
  private getUltraFastRiskPatterns(): Array<{
    regex: RegExp
    risk: RiskCategory
    mitigations: string[]
    isBlocker: boolean
    isWarning: boolean
  }> {
    return [
      {
        regex: /alter\s+table.*add\s+column.*not\s+null(?!.*default)/i,
        risk: {
          type: 'BLOCKING',
          severity: 'HIGH',
          description: 'Adding NOT NULL column without default causes table rewrite',
          affectedObjects: [],
          estimatedImpact: { lockDuration: 300, downtime: 300, rollbackDifficulty: 'MEDIUM' }
        },
        mitigations: ['Add column as nullable first', 'Populate with default values', 'Add NOT NULL constraint separately'],
        isBlocker: true,
        isWarning: true
      },
      {
        regex: /drop\s+(table|column)/i,
        risk: {
          type: 'DESTRUCTIVE',
          severity: 'CRITICAL',
          description: 'Destructive operation may cause permanent data loss',
          affectedObjects: [],
          estimatedImpact: { dataLoss: true, rollbackDifficulty: 'IMPOSSIBLE' }
        },
        mitigations: ['Create data backup before executing', 'Use soft delete patterns', 'Archive data instead of dropping'],
        isBlocker: true,
        isWarning: true
      },
      {
        regex: /create\s+index(?!\s+concurrently)/i,
        risk: {
          type: 'BLOCKING',
          severity: 'MEDIUM',
          description: 'Index creation without CONCURRENTLY causes table lock',
          affectedObjects: [],
          estimatedImpact: { lockDuration: 120, downtime: 120, rollbackDifficulty: 'EASY' }
        },
        mitigations: ['Use CREATE INDEX CONCURRENTLY', 'Run during maintenance window'],
        isBlocker: false,
        isWarning: true
      },
      {
        regex: /alter\s+table.*add\s+constraint/i,
        risk: {
          type: 'PERFORMANCE',
          severity: 'MEDIUM',
          description: 'Adding constraints can cause table scan and lock',
          affectedObjects: [],
          estimatedImpact: { lockDuration: 60, rollbackDifficulty: 'EASY' }
        },
        mitigations: ['Add constraint with NOT VALID first', 'Validate constraint separately'],
        isBlocker: false,
        isWarning: true
      }
    ]
  }

  private calculateRiskScore(categories: RiskCategory[]): number {
    let score = 0
    for (const category of categories) {
      switch (category.severity) {
        case 'LOW': score += 10; break
        case 'MEDIUM': score += 25; break
        case 'HIGH': score += 50; break
        case 'CRITICAL': score += 100; break
      }
    }
    return Math.min(score, 100)
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL'
    if (score >= 50) return 'HIGH'
    if (score >= 25) return 'MEDIUM'
    return 'LOW'
  }
  
  /**
   * Parse SQL into individual statements
   */
  private parseStatements(sql: string): string[] {
    // Simple statement separation - in production, use proper SQL parser
    return sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
  }
  
  /**
   * Analyze a single SQL statement for risks
   */
  private async analyzeStatement(statement: string, tableMetadata?: TableMetadata[]): Promise<{
    categories: RiskCategory[]
    mitigations: string[]
    warnings: string[]
    blockers: string[]
  }> {
    const categories: RiskCategory[] = []
    const mitigations: string[] = []
    const warnings: string[] = []
    const blockers: string[] = []
    
    const statementLower = statement.toLowerCase().trim()
    
    // Detect blocking operations
    const blockingRisks = this.detectBlockingOperations(statementLower, statement)
    categories.push(...blockingRisks.categories)
    mitigations.push(...blockingRisks.mitigations)
    warnings.push(...blockingRisks.warnings)
    
    // Detect destructive operations
    const destructiveRisks = this.detectDestructiveOperations(statementLower, statement)
    categories.push(...destructiveRisks.categories)
    mitigations.push(...destructiveRisks.mitigations)
    warnings.push(...destructiveRisks.warnings)
    
    // Detect performance impacts
    const performanceRisks = await this.detectPerformanceImpacts(statementLower, statement, tableMetadata)
    categories.push(...performanceRisks.categories)
    mitigations.push(...performanceRisks.mitigations)
    warnings.push(...performanceRisks.warnings)
    
    // Detect constraint violations
    const constraintRisks = this.detectConstraintViolations(statementLower, statement)
    categories.push(...constraintRisks.categories)
    mitigations.push(...constraintRisks.mitigations)
    warnings.push(...constraintRisks.warnings)
    
    // Detect downtime-causing operations
    const downtimeRisks = await this.detectDowntimeOperations(statementLower, statement, tableMetadata)
    categories.push(...downtimeRisks.categories)
    mitigations.push(...downtimeRisks.mitigations)
    blockers.push(...downtimeRisks.blockers)
    
    return { categories, mitigations, warnings, blockers }
  }
  
  /**
   * Detect operations that cause table locks or block other operations
   */
  private detectBlockingOperations(statementLower: string, originalStatement: string): {
    categories: RiskCategory[]
    mitigations: string[]
    warnings: string[]
  } {
    const categories: RiskCategory[] = []
    const mitigations: string[] = []
    const warnings: string[] = []
    
    // ALTER TABLE operations
    if (statementLower.includes('alter table')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      
      if (statementLower.includes('add column') && statementLower.includes('not null') && !statementLower.includes('default')) {
        categories.push({
          type: 'BLOCKING',
          severity: 'HIGH',
          description: 'Adding NOT NULL column without default requires table rewrite and exclusive lock',
          affectedObjects: [tableName || 'unknown_table'],
          estimatedImpact: {
            lockDuration: 300, // 5 minutes estimated
            rollbackDifficulty: 'MEDIUM'
          }
        })
        mitigations.push('Add column as nullable first, then populate and add NOT NULL constraint')
        mitigations.push('Add column with DEFAULT value to avoid table rewrite')
      }
      
      if (statementLower.includes('drop column')) {
        categories.push({
          type: 'BLOCKING',
          severity: 'MEDIUM',
          description: 'Dropping column requires exclusive table lock',
          affectedObjects: [tableName || 'unknown_table'],
          estimatedImpact: {
            lockDuration: 60, // 1 minute estimated
            rollbackDifficulty: 'HARD'
          }
        })
        mitigations.push('Consider renaming column first for gradual removal')
      }
      
      if (statementLower.includes('add constraint') && statementLower.includes('foreign key')) {
        categories.push({
          type: 'BLOCKING',
          severity: 'HIGH',
          description: 'Adding foreign key constraint requires exclusive locks on both tables',
          affectedObjects: [tableName || 'unknown_table'],
          estimatedImpact: {
            lockDuration: 180, // 3 minutes estimated
            rollbackDifficulty: 'MEDIUM'
          }
        })
        mitigations.push('Add constraint as NOT ENFORCED first, then validate separately')
        warnings.push('Ensure referential integrity before adding constraint')
      }
      
      if (statementLower.includes('add constraint') && statementLower.includes('unique')) {
        categories.push({
          type: 'BLOCKING',
          severity: 'MEDIUM',
          description: 'Adding unique constraint requires table scan and exclusive lock',
          affectedObjects: [tableName || 'unknown_table'],
          estimatedImpact: {
            lockDuration: 120, // 2 minutes estimated
            rollbackDifficulty: 'EASY'
          }
        })
        mitigations.push('Check for duplicate data before adding constraint')
        warnings.push('Unique constraint will fail if duplicate data exists')
      }
    }
    
    // CREATE INDEX without CONCURRENTLY
    if (statementLower.includes('create index') && !statementLower.includes('concurrently')) {
      const tableName = this.extractTableName(statementLower, 'on')
      
      categories.push({
        type: 'BLOCKING',
        severity: 'MEDIUM',
        description: 'Creating index without CONCURRENTLY blocks table writes',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          lockDuration: 120, // 2 minutes estimated
          rollbackDifficulty: 'EASY'
        }
      })
      
      if (this.dbConnection?.type === 'postgresql') {
        mitigations.push('Use CREATE INDEX CONCURRENTLY to avoid blocking writes')
      }
      warnings.push('Index creation time depends on table size')
    }
    
    return { categories, mitigations, warnings }
  }
  
  /**
   * Detect operations that can cause data loss
   */
  private detectDestructiveOperations(statementLower: string, originalStatement: string): {
    categories: RiskCategory[]
    mitigations: string[]
    warnings: string[]
  } {
    const categories: RiskCategory[] = []
    const mitigations: string[] = []
    const warnings: string[] = []
    
    // DROP operations
    if (statementLower.includes('drop table')) {
      const tableName = this.extractTableName(statementLower, 'drop table')
      categories.push({
        type: 'DESTRUCTIVE',
        severity: 'CRITICAL',
        description: 'Dropping table will permanently delete all data',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: 'IMPOSSIBLE'
        }
      })
      mitigations.push('Create backup before dropping table')
      mitigations.push('Consider renaming table instead of dropping')
      warnings.push('Data will be permanently lost')
    }
    
    if (statementLower.includes('drop column')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      categories.push({
        type: 'DESTRUCTIVE',
        severity: 'HIGH',
        description: 'Dropping column will permanently delete column data',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: 'IMPOSSIBLE'
        }
      })
      mitigations.push('Create backup of column data before dropping')
      mitigations.push('Consider renaming column instead of dropping')
      warnings.push('Column data will be permanently lost')
    }
    
    if (statementLower.includes('truncate table')) {
      const tableName = this.extractTableName(statementLower, 'truncate table')
      categories.push({
        type: 'DESTRUCTIVE',
        severity: 'CRITICAL',
        description: 'Truncating table will delete all rows',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: 'IMPOSSIBLE'
        }
      })
      mitigations.push('Use DELETE with WHERE clause if you need selective removal')
      warnings.push('All table data will be permanently lost')
    }
    
    // Risky UPDATE/DELETE operations
    if (statementLower.includes('delete from') && !statementLower.includes('where')) {
      const tableName = this.extractTableName(statementLower, 'delete from')
      categories.push({
        type: 'DESTRUCTIVE',
        severity: 'HIGH',
        description: 'DELETE without WHERE clause will remove all rows',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: 'HARD'
        }
      })
      warnings.push('DELETE without WHERE will remove all data')
      mitigations.push('Add WHERE clause to limit deletion scope')
    }
    
    if (statementLower.includes('update') && !statementLower.includes('where')) {
      const tableName = this.extractTableName(statementLower, 'update')
      categories.push({
        type: 'DESTRUCTIVE',
        severity: 'MEDIUM',
        description: 'UPDATE without WHERE clause will modify all rows',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          dataLoss: false,
          rollbackDifficulty: 'HARD'
        }
      })
      warnings.push('UPDATE without WHERE will modify all rows')
      mitigations.push('Add WHERE clause to limit update scope')
    }
    
    return { categories, mitigations, warnings }
  }
  
  /**
   * Detect operations with significant performance impact
   */
  private async detectPerformanceImpacts(statementLower: string, originalStatement: string, tableMetadata?: TableMetadata[]): Promise<{
    categories: RiskCategory[]
    mitigations: string[]
    warnings: string[]
  }> {
    const categories: RiskCategory[] = []
    const mitigations: string[] = []
    const warnings: string[] = []
    
    if (!tableMetadata) return { categories, mitigations, warnings }
    
    // Large table operations
    for (const table of tableMetadata) {
      const tableName = table.name.toLowerCase()
      
      if (statementLower.includes(tableName)) {
        // Operations on large tables
        if (table.rowCount > 1000000) { // 1M+ rows
          if (statementLower.includes('alter table')) {
            categories.push({
              type: 'PERFORMANCE',
              severity: 'HIGH',
              description: `Table ${table.name} has ${table.rowCount.toLocaleString()} rows - operation will be slow`,
              affectedObjects: [table.name],
              estimatedImpact: {
                lockDuration: Math.floor(table.rowCount / 1000), // 1 second per 1000 rows
                rollbackDifficulty: 'MEDIUM'
              }
            })
            mitigations.push('Consider maintenance window for large table operations')
            mitigations.push('Test operation on staging environment first')
          }
          
          if (statementLower.includes('create index')) {
            categories.push({
              type: 'PERFORMANCE',
              severity: 'MEDIUM',
              description: `Index creation on large table ${table.name} will take significant time`,
              affectedObjects: [table.name],
              estimatedImpact: {
                lockDuration: Math.floor(table.rowCount / 5000), // 1 second per 5000 rows
                rollbackDifficulty: 'EASY'
              }
            })
            mitigations.push('Use CONCURRENTLY option if available')
            warnings.push('Monitor index creation progress')
          }
        }
        
        // Operations that require full table scan
        if (statementLower.includes('add constraint') && statementLower.includes('check')) {
          categories.push({
            type: 'PERFORMANCE',
            severity: 'MEDIUM',
            description: `Adding CHECK constraint requires full table scan of ${table.name}`,
            affectedObjects: [table.name],
            estimatedImpact: {
              lockDuration: Math.floor(table.rowCount / 10000), // 1 second per 10000 rows
              rollbackDifficulty: 'EASY'
            }
          })
          warnings.push('CHECK constraint validation requires scanning all rows')
        }
      }
    }
    
    return { categories, mitigations, warnings }
  }
  
  /**
   * Detect potential constraint violations
   */
  private detectConstraintViolations(statementLower: string, originalStatement: string): {
    categories: RiskCategory[]
    mitigations: string[]
    warnings: string[]
  } {
    const categories: RiskCategory[] = []
    const mitigations: string[] = []
    const warnings: string[] = []
    
    // NOT NULL constraints on existing tables
    if (statementLower.includes('alter table') && statementLower.includes('not null')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      categories.push({
        type: 'CONSTRAINT',
        severity: 'HIGH',
        description: 'Adding NOT NULL constraint may fail if existing NULL values exist',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          rollbackDifficulty: 'EASY'
        }
      })
      mitigations.push('Check for NULL values before adding NOT NULL constraint')
      mitigations.push('Update NULL values with defaults before adding constraint')
      warnings.push('Migration will fail if NULL values exist in column')
    }
    
    // Unique constraints
    if (statementLower.includes('add constraint') && statementLower.includes('unique')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      categories.push({
        type: 'CONSTRAINT',
        severity: 'MEDIUM',
        description: 'Adding UNIQUE constraint may fail if duplicate values exist',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          rollbackDifficulty: 'EASY'
        }
      })
      mitigations.push('Check for duplicate values before adding UNIQUE constraint')
      mitigations.push('Clean up duplicate data before adding constraint')
      warnings.push('Migration will fail if duplicate values exist')
    }
    
    return { categories, mitigations, warnings }
  }
  
  /**
   * Detect operations that cause downtime
   */
  private async detectDowntimeOperations(statementLower: string, originalStatement: string, tableMetadata?: TableMetadata[]): Promise<{
    categories: RiskCategory[]
    mitigations: string[]
    blockers: string[]
  }> {
    const categories: RiskCategory[] = []
    const mitigations: string[] = []
    const blockers: string[] = []
    
    // Operations that require application downtime
    if (statementLower.includes('rename table') || statementLower.includes('alter table') && statementLower.includes('rename to')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      categories.push({
        type: 'DOWNTIME',
        severity: 'HIGH',
        description: 'Renaming table will break application references',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          downtime: 60, // 1 minute estimated
          rollbackDifficulty: 'MEDIUM'
        }
      })
      mitigations.push('Coordinate with application deployment')
      mitigations.push('Update application code to use new table name')
      blockers.push('Application must be updated before/after table rename')
    }
    
    // Column type changes that require conversion
    if (statementLower.includes('alter column') && statementLower.includes('type')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      categories.push({
        type: 'DOWNTIME',
        severity: 'MEDIUM',
        description: 'Changing column type may require data conversion and application updates',
        affectedObjects: [tableName || 'unknown_table'],
        estimatedImpact: {
          downtime: 30, // 30 seconds estimated
          rollbackDifficulty: 'HARD'
        }
      })
      mitigations.push('Test data conversion on staging environment')
      mitigations.push('Verify application compatibility with new data type')
      warnings.push('Data conversion may fail if values are incompatible')
    }
    
    return { categories, mitigations, blockers }
  }
  
  /**
   * Extract table name from SQL statement
   */
  private extractTableName(statement: string, afterKeyword: string): string | null {
    const regex = new RegExp(`${afterKeyword}\\s+([\\w\\-_\\.]+)`, 'i')
    const match = statement.match(regex)
    return match ? match[1] : null
  }
} 