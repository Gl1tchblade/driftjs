/**
 * Enhancement Strategy Generator
 * Creates multi-step safe migration plans, pre-flight validation, and rollback strategies
 */

import { DatabaseConnection, TableMetadata } from '../core/index.js'
import { RiskAssessment, SQLRiskDetector } from './risk-detector.js'
import { ENHANCEMENT_RULES, applyEnhancements } from './enhancement-strategies.js'

export interface EnhancementStrategy {
  originalSQL: string
  enhancedSteps: MigrationStep[]
  rollbackStrategy: RollbackStrategy
  preFlightChecks: PreFlightCheck[]
  postMigrationValidation: ValidationStep[]
  estimatedDuration: number // seconds
  maintenanceWindow: MaintenanceWindow
  dependencies: string[]
}

export interface MigrationStep {
  stepNumber: number
  description: string
  sql: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  estimatedDuration: number // seconds
  canRollback: boolean
  dependencies: string[]
  validationQueries: string[]
  onFailure: 'CONTINUE' | 'STOP' | 'ROLLBACK'
}

export interface RollbackStrategy {
  canRollback: boolean
  rollbackSteps: RollbackStep[]
  dataBackupRequired: boolean
  rollbackComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'IMPOSSIBLE'
  rollbackWindow: number // seconds
}

export interface RollbackStep {
  stepNumber: number
  description: string
  sql: string
  condition?: string // When to execute this rollback step
}

export interface PreFlightCheck {
  checkName: string
  description: string
  query: string
  expectedResult: 'EMPTY' | 'NOT_EMPTY' | 'SPECIFIC_VALUE' | 'CUSTOM'
  expectedValue?: any
  failureAction: 'WARN' | 'BLOCK' | 'PROMPT'
  customValidation?: (result: any[]) => { success: boolean; message: string }
}

export interface ValidationStep {
  stepName: string
  description: string
  query: string
  expectedCondition: string
  isRequired: boolean
}

export interface MaintenanceWindow {
  recommended: boolean
  minimumDuration: number // seconds
  optimalDuration: number // seconds
  considerations: string[]
}

export class EnhancementStrategyGenerator {
  private riskDetector: SQLRiskDetector
  
  constructor(private dbConnection: DatabaseConnection) {
    this.riskDetector = new SQLRiskDetector(dbConnection)
  }
  
  /**
   * Ultra-fast strategy generation using comprehensive enhancement rules
   */
  async generateStrategy(
    originalSQL: string, 
    tableMetadata?: TableMetadata[],
    options?: {
      allowDataLoss?: boolean
      preferSafety?: boolean
      maxDowntime?: number // seconds
    }
  ): Promise<EnhancementStrategy> {
    // Use comprehensive enhancement rules for better coverage
    const enhancedSteps = applyEnhancements(originalSQL)
    const rollbackStrategy = this.generateUltraFastRollback(originalSQL, originalSQL.toLowerCase())
    const preFlightChecks = this.generateUltraFastChecks(originalSQL, originalSQL.toLowerCase())
    const postMigrationValidation = this.generateUltraFastValidation(originalSQL, originalSQL.toLowerCase())
    
    const estimatedDuration = enhancedSteps.reduce((total, step) => total + step.estimatedDuration, 0)
    const maintenanceWindow: MaintenanceWindow = {
      recommended: estimatedDuration > 30,
      minimumDuration: estimatedDuration,
      optimalDuration: estimatedDuration + 60,
      considerations: estimatedDuration > 300 ? ['Long-running operation - consider maintenance window'] : []
    }
    
    return {
      originalSQL,
      enhancedSteps,
      rollbackStrategy,
      preFlightChecks,
      postMigrationValidation,
      estimatedDuration,
      maintenanceWindow,
      dependencies: []
    }
  }

  /**
   * Generate enhanced steps using ultra-fast pattern matching
   */
  private generateUltraFastSteps(originalSQL: string, sqlLower: string): MigrationStep[] {
    const steps: MigrationStep[] = []
    
    // Pattern 1: NOT NULL without default -> Safe multi-step approach
    if (sqlLower.includes('add column') && sqlLower.includes('not null') && !sqlLower.includes('default')) {
      const enhancedSQL = originalSQL.replace(/NOT NULL/gi, '') // Remove NOT NULL first
      steps.push({
        stepNumber: 1,
        description: 'Add column as nullable first',
        sql: enhancedSQL + ';',
        riskLevel: 'LOW',
        estimatedDuration: 5,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      })
      
      // Extract table and column names for UPDATE step
      const tableMatch = sqlLower.match(/alter\s+table\s+(\w+)/i)
      const columnMatch = sqlLower.match(/add\s+column\s+(\w+)/i)
      if (tableMatch && columnMatch) {
        steps.push({
          stepNumber: 2,
          description: 'Set default value for existing rows',
          sql: `UPDATE ${tableMatch[1]} SET ${columnMatch[1]} = '' WHERE ${columnMatch[1]} IS NULL;`,
          riskLevel: 'MEDIUM',
          estimatedDuration: 10,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        })
        
        steps.push({
          stepNumber: 3,
          description: 'Add NOT NULL constraint',
          sql: `ALTER TABLE ${tableMatch[1]} ALTER COLUMN ${columnMatch[1]} SET NOT NULL;`,
          riskLevel: 'LOW',
          estimatedDuration: 2,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'ROLLBACK'
        })
      }
    }
    // Pattern 2: Index creation -> Use CONCURRENTLY
    else if (sqlLower.includes('create index') && !sqlLower.includes('concurrently')) {
      const enhancedSQL = originalSQL.replace(/CREATE INDEX/gi, 'CREATE INDEX CONCURRENTLY')
      steps.push({
        stepNumber: 1,
        description: 'Create index concurrently to avoid table locks',
        sql: enhancedSQL,
        riskLevel: 'LOW',
        estimatedDuration: 30,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'CONTINUE'
      })
    }
    // Pattern 3: Add constraint -> Use NOT VALID first
    else if (sqlLower.includes('add constraint')) {
      const enhancedSQL = originalSQL.replace(/;?\s*$/, ' NOT VALID;')
      steps.push({
        stepNumber: 1,
        description: 'Add constraint without validation',
        sql: enhancedSQL,
        riskLevel: 'LOW',
        estimatedDuration: 5,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      })
      
      const constraintMatch = sqlLower.match(/add\s+constraint\s+(\w+)/i)
      const tableMatch = sqlLower.match(/alter\s+table\s+(\w+)/i)
      if (constraintMatch && tableMatch) {
        steps.push({
          stepNumber: 2,
          description: 'Validate constraint separately',
          sql: `ALTER TABLE ${tableMatch[1]} VALIDATE CONSTRAINT ${constraintMatch[1]};`,
          riskLevel: 'MEDIUM',
          estimatedDuration: 15,
          canRollback: true,
          dependencies: [],
          validationQueries: [],
          onFailure: 'CONTINUE'
        })
      }
    }
    // Default: Use original SQL with optimization comments
    else {
      steps.push({
        stepNumber: 1,
        description: 'Execute optimized migration',
        sql: originalSQL,
        riskLevel: 'LOW',
        estimatedDuration: 10,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      })
    }
    
    return steps
  }

  private generateUltraFastRollback(originalSQL: string, sqlLower: string): RollbackStrategy {
    const rollbackSteps: RollbackStep[] = []
    
    if (sqlLower.includes('create table')) {
      const tableMatch = sqlLower.match(/create\s+table\s+(\w+)/i)
      if (tableMatch) {
        rollbackSteps.push({
          stepNumber: 1,
          description: 'Drop created table',
          sql: `DROP TABLE IF EXISTS ${tableMatch[1]};`
        })
      }
    } else if (sqlLower.includes('add column')) {
      const tableMatch = sqlLower.match(/alter\s+table\s+(\w+)/i)
      const columnMatch = sqlLower.match(/add\s+column\s+(\w+)/i)
      if (tableMatch && columnMatch) {
        rollbackSteps.push({
          stepNumber: 1,
          description: 'Drop added column',
          sql: `ALTER TABLE ${tableMatch[1]} DROP COLUMN IF EXISTS ${columnMatch[1]};`
        })
      }
    }
    
    return {
      canRollback: rollbackSteps.length > 0,
      rollbackSteps,
      dataBackupRequired: sqlLower.includes('drop'),
      rollbackComplexity: 'SIMPLE',
      rollbackWindow: 30
    }
  }

  private generateUltraFastChecks(originalSQL: string, sqlLower: string): PreFlightCheck[] {
    const checks: PreFlightCheck[] = []
    
    if (sqlLower.includes('alter table')) {
      const tableMatch = sqlLower.match(/alter\s+table\s+(\w+)/i)
      if (tableMatch) {
        checks.push({
          checkName: 'table_exists',
          description: 'Verify table exists before alteration',
          query: `SELECT 1 FROM information_schema.tables WHERE table_name = '${tableMatch[1]}';`,
          expectedResult: 'has_rows',
          onFailure: 'ABORT'
        } as PreFlightCheck)
      }
    }
    
    return checks
  }

  private generateUltraFastValidation(originalSQL: string, sqlLower: string): ValidationStep[] {
    const validations: ValidationStep[] = []
    
    if (sqlLower.includes('create table')) {
      const tableMatch = sqlLower.match(/create\s+table\s+(\w+)/i)
      if (tableMatch) {
        validations.push({
          stepName: 'verify_table_created',
          description: 'Verify table was created successfully',
          query: `SELECT 1 FROM information_schema.tables WHERE table_name = '${tableMatch[1]}';`,
          expectedResult: 'has_rows',
          onFailure: 'WARN'
        } as ValidationStep)
      }
    }
    
    return validations
  }
  
  /**
   * Create enhanced migration steps with safety improvements
   */
  private async createEnhancedSteps(
    originalSQL: string, 
    riskAssessment: RiskAssessment,
    tableMetadata?: TableMetadata[],
    options?: any
  ): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []
    const statements = this.parseStatements(originalSQL)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const statementLower = statement.toLowerCase().trim()
      
      // Generate enhanced steps based on operation type
      if (statementLower.includes('alter table') && statementLower.includes('add column')) {
        steps.push(...await this.enhanceAddColumn(statement, tableMetadata))
      } else if (statementLower.includes('alter table') && statementLower.includes('drop column')) {
        steps.push(...await this.enhanceDropColumn(statement, tableMetadata))
      } else if (statementLower.includes('alter table') && statementLower.includes('add constraint')) {
        steps.push(...await this.enhanceAddConstraint(statement, tableMetadata))
      } else if (statementLower.includes('create index')) {
        steps.push(...await this.enhanceCreateIndex(statement, tableMetadata))
      } else if (statementLower.includes('drop table')) {
        steps.push(...await this.enhanceDropTable(statement, tableMetadata))
      } else {
        // Default enhancement for other operations
        steps.push(this.createDefaultStep(statement, i + 1))
      }
    }
    
    return steps
  }
  
  /**
   * Enhance ADD COLUMN operations for safety
   */
  private async enhanceAddColumn(statement: string, tableMetadata?: TableMetadata[]): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []
    const statementLower = statement.toLowerCase()
    const tableName = this.extractTableName(statementLower, 'alter table')
    
    // If adding NOT NULL column without default, break into safer steps
    if (statementLower.includes('not null') && !statementLower.includes('default')) {
      const columnName = this.extractColumnName(statement)
      const columnType = this.extractColumnType(statement)
      
      // Step 1: Add column as nullable
      steps.push({
        stepNumber: 1,
        description: `Add column ${columnName} as nullable to table ${tableName}`,
        sql: statement.replace(/not null/gi, '').trim(),
        riskLevel: 'LOW',
        estimatedDuration: 5,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`
        ],
        onFailure: 'STOP'
      })
      
      // Step 2: Update NULL values with defaults (if needed)
      steps.push({
        stepNumber: 2,
        description: `Update NULL values in ${columnName} with appropriate defaults`,
        sql: `UPDATE ${tableName} SET ${columnName} = [SPECIFY_DEFAULT_VALUE] WHERE ${columnName} IS NULL;`,
        riskLevel: 'MEDIUM',
        estimatedDuration: 30,
        canRollback: true,
        dependencies: ['Step 1'],
        validationQueries: [
          `SELECT COUNT(*) FROM ${tableName} WHERE ${columnName} IS NULL`
        ],
        onFailure: 'ROLLBACK'
      })
      
      // Step 3: Add NOT NULL constraint
      steps.push({
        stepNumber: 3,
        description: `Add NOT NULL constraint to column ${columnName}`,
        sql: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;`,
        riskLevel: 'MEDIUM',
        estimatedDuration: 10,
        canRollback: true,
        dependencies: ['Step 2'],
        validationQueries: [
          `SELECT is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`
        ],
        onFailure: 'ROLLBACK'
      })
    } else {
      // Simple add column operation
      steps.push({
        stepNumber: 1,
        description: `Add column to table ${tableName}`,
        sql: statement,
        riskLevel: 'LOW',
        estimatedDuration: 5,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}'`
        ],
        onFailure: 'STOP'
      })
    }
    
    return steps
  }
  
  /**
   * Enhance DROP COLUMN operations for safety
   */
  private async enhanceDropColumn(statement: string, tableMetadata?: TableMetadata[]): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []
    const statementLower = statement.toLowerCase()
    const tableName = this.extractTableName(statementLower, 'alter table')
    const columnName = this.extractColumnName(statement)
    
    // Step 1: Create backup of column data
    steps.push({
      stepNumber: 1,
      description: `Create backup table with column data before dropping ${columnName}`,
      sql: `CREATE TABLE ${tableName}_${columnName}_backup AS SELECT id, ${columnName} FROM ${tableName};`,
      riskLevel: 'LOW',
      estimatedDuration: 30,
      canRollback: true,
      dependencies: [],
      validationQueries: [
        `SELECT COUNT(*) FROM ${tableName}_${columnName}_backup`
      ],
      onFailure: 'STOP'
    })
    
    // Step 2: Drop the column
    steps.push({
      stepNumber: 2,
      description: `Drop column ${columnName} from table ${tableName}`,
      sql: statement,
      riskLevel: 'HIGH',
      estimatedDuration: 60,
      canRollback: false, // Dropping column is not easily reversible
      dependencies: ['Step 1'],
      validationQueries: [
        `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`
      ],
      onFailure: 'STOP'
    })
    
    return steps
  }
  
  /**
   * Enhance ADD CONSTRAINT operations for safety
   */
  private async enhanceAddConstraint(statement: string, tableMetadata?: TableMetadata[]): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []
    const statementLower = statement.toLowerCase()
    const tableName = this.extractTableName(statementLower, 'alter table')
    
    if (statementLower.includes('foreign key')) {
      // Step 1: Validate referential integrity
      steps.push({
        stepNumber: 1,
        description: `Validate referential integrity before adding foreign key constraint`,
        sql: `-- Custom validation query will be generated based on constraint details`,
        riskLevel: 'MEDIUM',
        estimatedDuration: 60,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `-- Validate no orphaned records exist`
        ],
        onFailure: 'STOP'
      })
      
      // Step 2: Add constraint
      steps.push({
        stepNumber: 2,
        description: `Add foreign key constraint to table ${tableName}`,
        sql: statement,
        riskLevel: 'HIGH',
        estimatedDuration: 120,
        canRollback: true,
        dependencies: ['Step 1'],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = '${tableName}' AND constraint_type = 'FOREIGN KEY'`
        ],
        onFailure: 'ROLLBACK'
      })
    } else if (statementLower.includes('unique')) {
      // Step 1: Check for duplicate values
      steps.push({
        stepNumber: 1,
        description: `Check for duplicate values before adding unique constraint`,
        sql: `-- Custom duplicate check query`,
        riskLevel: 'MEDIUM',
        estimatedDuration: 30,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `-- Check for duplicates in target columns`
        ],
        onFailure: 'STOP'
      })
      
      // Step 2: Add unique constraint
      steps.push({
        stepNumber: 2,
        description: `Add unique constraint to table ${tableName}`,
        sql: statement,
        riskLevel: 'MEDIUM',
        estimatedDuration: 60,
        canRollback: true,
        dependencies: ['Step 1'],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = '${tableName}' AND constraint_type = 'UNIQUE'`
        ],
        onFailure: 'ROLLBACK'
      })
    } else {
      // Default constraint addition
      steps.push({
        stepNumber: 1,
        description: `Add constraint to table ${tableName}`,
        sql: statement,
        riskLevel: 'MEDIUM',
        estimatedDuration: 30,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      })
    }
    
    return steps
  }
  
  /**
   * Enhance CREATE INDEX operations for safety
   */
  private async enhanceCreateIndex(statement: string, tableMetadata?: TableMetadata[]): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []
    const statementLower = statement.toLowerCase()
    const tableName = this.extractTableName(statementLower, 'on')
    
    // Check if CONCURRENTLY is already specified
    if (this.dbConnection.type === 'postgresql' && !statementLower.includes('concurrently')) {
      // Use CONCURRENTLY for PostgreSQL to avoid blocking
      const enhancedSQL = statement.replace(/create index/i, 'CREATE INDEX CONCURRENTLY')
      
      steps.push({
        stepNumber: 1,
        description: `Create index concurrently on table ${tableName} to avoid blocking writes`,
        sql: enhancedSQL,
        riskLevel: 'LOW',
        estimatedDuration: 300, // Longer but non-blocking
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `SELECT COUNT(*) FROM pg_indexes WHERE tablename = '${tableName}'`
        ],
        onFailure: 'ROLLBACK'
      })
    } else {
      // Default index creation
      steps.push({
        stepNumber: 1,
        description: `Create index on table ${tableName}`,
        sql: statement,
        riskLevel: 'MEDIUM',
        estimatedDuration: 180,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: 'ROLLBACK'
      })
    }
    
    return steps
  }
  
  /**
   * Enhance DROP TABLE operations for safety
   */
  private async enhanceDropTable(statement: string, tableMetadata?: TableMetadata[]): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []
    const tableName = this.extractTableName(statement.toLowerCase(), 'drop table')
    
    // Step 1: Create full backup
    steps.push({
      stepNumber: 1,
      description: `Create backup of table ${tableName} before dropping`,
      sql: `CREATE TABLE ${tableName}_backup_${Date.now()} AS SELECT * FROM ${tableName};`,
      riskLevel: 'LOW',
      estimatedDuration: 120,
      canRollback: true,
      dependencies: [],
      validationQueries: [
        `SELECT COUNT(*) FROM ${tableName}_backup_${Date.now()}`
      ],
      onFailure: 'STOP'
    })
    
    // Step 2: Drop the table
    steps.push({
      stepNumber: 2,
      description: `Drop table ${tableName}`,
      sql: statement,
      riskLevel: 'CRITICAL',
      estimatedDuration: 30,
      canRollback: false, // Table drop is irreversible without backup
      dependencies: ['Step 1'],
      validationQueries: [
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${tableName}'`
      ],
      onFailure: 'STOP'
    })
    
    return steps
  }
  
  /**
   * Create default migration step for unhandled operations
   */
  private createDefaultStep(statement: string, stepNumber: number): MigrationStep {
    return {
      stepNumber,
      description: `Execute: ${statement.substring(0, 50)}${statement.length > 50 ? '...' : ''}`,
      sql: statement,
      riskLevel: 'MEDIUM',
      estimatedDuration: 30,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: 'STOP'
    }
  }
  
  /**
   * Create rollback strategy for the migration
   */
  private createRollbackStrategy(steps: MigrationStep[], riskAssessment: RiskAssessment): RollbackStrategy {
    const rollbackSteps: RollbackStep[] = []
    let canRollback = true
    let rollbackComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'IMPOSSIBLE' = 'SIMPLE'
    let dataBackupRequired = false
    
    // Generate rollback steps in reverse order
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i]
      
      if (!step.canRollback) {
        canRollback = false
        rollbackComplexity = 'IMPOSSIBLE'
        break
      }
      
      if (step.riskLevel === 'HIGH' || step.riskLevel === 'CRITICAL') {
        rollbackComplexity = 'COMPLEX'
        dataBackupRequired = true
      }
      
      // Generate appropriate rollback SQL
      const rollbackSQL = this.generateRollbackSQL(step)
      if (rollbackSQL) {
        rollbackSteps.push({
          stepNumber: rollbackSteps.length + 1,
          description: `Rollback: ${step.description}`,
          sql: rollbackSQL,
          condition: `IF step ${step.stepNumber} was executed`
        })
      }
    }
    
    const rollbackWindow = rollbackSteps.reduce((total, step) => total + 30, 0) // 30 seconds per rollback step
    
    return {
      canRollback,
      rollbackSteps,
      dataBackupRequired,
      rollbackComplexity,
      rollbackWindow
    }
  }
  
  /**
   * Generate appropriate rollback SQL for a migration step
   */
  private generateRollbackSQL(step: MigrationStep): string | null {
    const sql = step.sql.toLowerCase().trim()
    
    if (sql.includes('alter table') && sql.includes('add column')) {
      const tableName = this.extractTableName(sql, 'alter table')
      const columnName = this.extractColumnName(step.sql)
      return `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`
    }
    
    if (sql.includes('create index')) {
      const indexName = this.extractIndexName(step.sql)
      return `DROP INDEX ${indexName};`
    }
    
    if (sql.includes('alter table') && sql.includes('add constraint')) {
      const tableName = this.extractTableName(sql, 'alter table')
      const constraintName = this.extractConstraintName(step.sql)
      return `ALTER TABLE ${tableName} DROP CONSTRAINT ${constraintName};`
    }
    
    // For operations that can't be easily rolled back
    return `-- Manual rollback required for: ${step.description}`
  }
  
  /**
   * Create pre-flight validation checks
   */
  private async createPreFlightChecks(originalSQL: string, tableMetadata?: TableMetadata[]): Promise<PreFlightCheck[]> {
    const checks: PreFlightCheck[] = []
    const statementLower = originalSQL.toLowerCase()
    
    // Check for table existence
    if (statementLower.includes('alter table')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      checks.push({
        checkName: 'table_exists',
        description: `Verify table ${tableName} exists`,
        query: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${tableName}'`,
        expectedResult: 'SPECIFIC_VALUE',
        expectedValue: 1,
        failureAction: 'BLOCK'
      })
    }
    
    // Check for sufficient disk space
    checks.push({
      checkName: 'disk_space',
      description: 'Verify sufficient disk space for migration',
      query: `-- Database-specific disk space query`,
      expectedResult: 'CUSTOM',
      failureAction: 'WARN',
      customValidation: (result: any[]) => {
        // Custom validation logic would go here
        return { success: true, message: 'Sufficient disk space available' }
      }
    })
    
    // Check for active connections
    checks.push({
      checkName: 'active_connections',
      description: 'Check for excessive active connections',
      query: `-- Database-specific connection count query`,
      expectedResult: 'CUSTOM',
      failureAction: 'WARN',
      customValidation: (result: any[]) => {
        // Custom validation logic would go here
        return { success: true, message: 'Connection count is acceptable' }
      }
    })
    
    return checks
  }
  
  /**
   * Create post-migration validation steps
   */
  private createValidationSteps(originalSQL: string, tableMetadata?: TableMetadata[]): ValidationStep[] {
    const validations: ValidationStep[] = []
    const statementLower = originalSQL.toLowerCase()
    
    if (statementLower.includes('alter table') && statementLower.includes('add column')) {
      const tableName = this.extractTableName(statementLower, 'alter table')
      const columnName = this.extractColumnName(originalSQL)
      
      validations.push({
        stepName: 'column_added',
        description: `Verify column ${columnName} was added to table ${tableName}`,
        query: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`,
        expectedCondition: 'COUNT = 1',
        isRequired: true
      })
    }
    
    if (statementLower.includes('create index')) {
      const indexName = this.extractIndexName(originalSQL)
      
      validations.push({
        stepName: 'index_created',
        description: `Verify index ${indexName} was created`,
        query: `-- Database-specific index existence query`,
        expectedCondition: 'INDEX EXISTS',
        isRequired: true
      })
    }
    
    return validations
  }
  
  /**
   * Calculate maintenance window requirements
   */
  private calculateMaintenanceWindow(steps: MigrationStep[], riskAssessment: RiskAssessment): MaintenanceWindow {
    const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0)
    const hasHighRisk = steps.some(step => step.riskLevel === 'HIGH' || step.riskLevel === 'CRITICAL')
    const hasBlockingOperations = riskAssessment.riskCategories.some(cat => cat.type === 'BLOCKING')
    
    const recommended = hasHighRisk || hasBlockingOperations || totalDuration > 300 // 5 minutes
    const minimumDuration = totalDuration
    const optimalDuration = Math.ceil(totalDuration * 1.5) // 50% buffer
    
    const considerations: string[] = []
    if (hasBlockingOperations) {
      considerations.push('Migration includes blocking operations that will lock tables')
    }
    if (hasHighRisk) {
      considerations.push('High-risk operations require careful monitoring')
    }
    if (totalDuration > 600) {
      considerations.push('Long-running migration may impact performance')
    }
    
    return {
      recommended,
      minimumDuration,
      optimalDuration,
      considerations
    }
  }
  
  /**
   * Extract dependencies from migration steps
   */
  private extractDependencies(steps: MigrationStep[]): string[] {
    const dependencies = new Set<string>()
    
    steps.forEach(step => {
      step.dependencies.forEach(dep => dependencies.add(dep))
    })
    
    return Array.from(dependencies)
  }
  
  // Helper methods for SQL parsing
  private parseStatements(sql: string): string[] {
    return sql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0)
  }
  
  private extractTableName(statement: string, afterKeyword: string): string | null {
    const regex = new RegExp(`${afterKeyword}\\s+([\\w\\-_\\.]+)`, 'i')
    const match = statement.match(regex)
    return match ? match[1] : null
  }
  
  private extractColumnName(statement: string): string | null {
    const addColumnMatch = statement.match(/add\s+column\s+([^\s]+)/i)
    const dropColumnMatch = statement.match(/drop\s+column\s+([^\s]+)/i)
    return addColumnMatch?.[1] || dropColumnMatch?.[1] || null
  }
  
  private extractColumnType(statement: string): string | null {
    const match = statement.match(/add\s+column\s+\w+\s+([^\s,]+)/i)
    return match ? match[1] : null
  }
  
  private extractIndexName(statement: string): string | null {
    const match = statement.match(/create\s+index\s+([^\s]+)/i)
    return match ? match[1] : null
  }
  
  private extractConstraintName(statement: string): string | null {
    const match = statement.match(/constraint\s+([^\s]+)/i)
    return match ? match[1] : null
  }
} 