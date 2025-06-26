import type { MigrationFile, EnhancedMigration } from '../core/index.js'
import { SQLRiskDetector } from './risk-detector.js'
import { EnhancementStrategyGenerator } from './strategy-generator.js'

/**
 * Ultra-fast enhancement engine optimized for sub-second analysis
 * Uses caching, parallel processing, and optimized algorithms
 */
export class EnhancementEngine {
  private risk = new SQLRiskDetector()
  private generator = new EnhancementStrategyGenerator({} as any)
  private enhancementCache = new Map<string, EnhancedMigration>()
  
  /**
   * Ultra-fast migration analysis with aggressive caching and optimization
   */
  public async enhance(migration: MigrationFile): Promise<EnhancedMigration> {
    // Ultra-fast cache check using content hash
    const cacheKey = this.generateCacheKey(migration.up)
    if (this.enhancementCache.has(cacheKey)) {
      const cached = this.enhancementCache.get(cacheKey)!
      return {
        ...cached,
        original: migration // Update original reference
      }
    }

    // Parallel risk analysis and strategy generation for maximum speed
    const [riskReport, strategy] = await Promise.all([
      this.risk.analyzeSQL(migration.up),
      this.generator.generateStrategy(migration.up)
    ])

    const enhanced: EnhancedMigration = {
      original: migration,
      enhanced: {
        up: strategy.enhancedSteps.map(s => s.sql).join('\n'),
        down: strategy.rollbackStrategy.rollbackSteps.map(s => s.sql).join('\n'),
        preFlightChecks: strategy.preFlightChecks.map(c => c.query),
        postMigrationValidation: strategy.postMigrationValidation.map(v => v.query),
        rollbackStrategy: strategy.rollbackStrategy.rollbackSteps.map(s => s.sql)
      },
      estimatedDuration: strategy.estimatedDuration,
    } as EnhancedMigration

    // Cache for ultra-fast future lookups
    this.enhancementCache.set(cacheKey, enhanced)
    
    return enhanced
  }

  /**
   * Generate ultra-fast cache key using simple hash
   */
  private generateCacheKey(sql: string): string {
    // Simple but fast hash for caching
    let hash = 0
    for (let i = 0; i < sql.length; i++) {
      const char = sql.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Clear cache if needed
   */
  public clearCache(): void {
    this.enhancementCache.clear()
  }
} 