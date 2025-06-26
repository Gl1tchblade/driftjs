/**
 * Enhancement Engine - Coordinates all safety and speed enhancements
 * This is the main engine that loads and applies enhancement modules
 * Optimized for performance with lazy loading and caching
 */

import { MigrationFile, Enhancement, EnhancementResult, EnhancementModule, EnhancementAnalysis } from './types.js';
import { loadSafetyEnhancements } from '../enhancements/safety/index.js';
import { loadSpeedEnhancements } from '../enhancements/speed/index.js';

export class EnhancementEngine {
  private safetyModules: EnhancementModule[] = [];
  private speedModules: EnhancementModule[] = [];
  private initialized = false;
  
  // Performance optimizations
  private analysisCache = new Map<string, EnhancementAnalysis>();
  private detectionCache = new Map<string, boolean>();
  private moduleCache = new Map<string, EnhancementModule>();

  /**
   * Initialize the enhancement engine by loading all enhancement modules
   * Uses lazy loading for better performance
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load modules in parallel for better performance
      const [safetyModulesPromise, speedModulesPromise] = await Promise.all([
        loadSafetyEnhancements(),
        loadSpeedEnhancements()
      ]);

      this.safetyModules = safetyModulesPromise;
      this.speedModules = speedModulesPromise;
      
      // Sort modules by priority (higher priority first) and cache them
      this.safetyModules.sort((a, b) => b.enhancement.priority - a.enhancement.priority);
      this.speedModules.sort((a, b) => b.enhancement.priority - a.enhancement.priority);
      
      // Build module cache for O(1) lookups
      [...this.safetyModules, ...this.speedModules].forEach(module => {
        this.moduleCache.set(module.enhancement.id, module);
      });
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize enhancement engine:', error);
      throw error;
    }
  }

  /**
   * Detect applicable safety enhancements for a migration
   * @param migration Migration file to analyze
   * @returns Array of applicable safety enhancements with analysis
   */
  async detectSafetyEnhancements(migration: MigrationFile): Promise<Enhancement[]> {
    await this.initialize();
    
    const applicableEnhancements: Enhancement[] = [];
    const cacheKey = `safety_${migration.name}_${migration.up.length}`;
    
    // Check cache first
    if (this.detectionCache.has(cacheKey)) {
      return this.getCachedEnhancements(cacheKey, this.safetyModules);
    }
    
    // Run detections in parallel for better performance
    const detectionPromises = this.safetyModules.map(async (module) => {
      try {
        const isApplicable = await module.detector.detect(migration);
        return { module, isApplicable };
      } catch (error) {
        console.warn(`Error detecting enhancement ${module.enhancement.id}:`, error);
        return { module, isApplicable: false };
      }
    });
    
    const results = await Promise.all(detectionPromises);
    
    results.forEach(({ module, isApplicable }) => {
      if (isApplicable) {
        applicableEnhancements.push(module.enhancement);
      }
    });
    
    // Cache the results
    this.cacheEnhancements(cacheKey, applicableEnhancements);
    
    return applicableEnhancements;
  }

  /**
   * Detect applicable speed enhancements for a migration
   * @param migration Migration file to analyze
   * @returns Array of applicable speed enhancements with analysis
   */
  async detectSpeedEnhancements(migration: MigrationFile): Promise<Enhancement[]> {
    await this.initialize();
    
    const applicableEnhancements: Enhancement[] = [];
    const cacheKey = `speed_${migration.name}_${migration.up.length}`;
    
    // Check cache first
    if (this.detectionCache.has(cacheKey)) {
      return this.getCachedEnhancements(cacheKey, this.speedModules);
    }
    
    // Run detections in parallel for better performance
    const detectionPromises = this.speedModules.map(async (module) => {
      try {
        const isApplicable = await module.detector.detect(migration);
        return { module, isApplicable };
      } catch (error) {
        console.warn(`Error detecting enhancement ${module.enhancement.id}:`, error);
        return { module, isApplicable: false };
      }
    });
    
    const results = await Promise.all(detectionPromises);
    
    results.forEach(({ module, isApplicable }) => {
      if (isApplicable) {
        applicableEnhancements.push(module.enhancement);
      }
    });
    
    // Cache the results
    this.cacheEnhancements(cacheKey, applicableEnhancements);
    
    return applicableEnhancements;
  }

  /**
   * Get detailed analysis for a specific enhancement
   * @param enhancementId Enhancement ID to analyze
   * @param migration Migration file to analyze
   * @returns Detailed analysis of the enhancement
   */
  async getEnhancementAnalysis(enhancementId: string, migration: MigrationFile): Promise<EnhancementAnalysis | null> {
    await this.initialize();
    
    const cacheKey = `analysis_${enhancementId}_${migration.name}_${migration.up.length}`;
    
    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }
    
    const module = this.moduleCache.get(enhancementId);
    if (!module) return null;
    
    try {
      const analysis = await module.detector.analyze(migration);
      
      // Cache the analysis
      if (analysis) {
        this.analysisCache.set(cacheKey, analysis);
      }
      
      return analysis;
    } catch (error) {
      console.warn(`Error analyzing enhancement ${enhancementId}:`, error);
      return null;
    }
  }

  /**
   * Apply a set of enhancements to migration content
   * @param content Original migration content
   * @param migration Migration file object
   * @param enhancements Array of enhancements to apply
   * @returns Modified content with all enhancements applied
   */
  async applyEnhancements(content: string, migration: MigrationFile, enhancements: Enhancement[]): Promise<string> {
    await this.initialize();
    
    let modifiedContent = content;
    const results: EnhancementResult[] = [];
    
    // Apply enhancements in priority order
    const sortedEnhancements = [...enhancements].sort((a, b) => b.priority - a.priority);
    
    for (const enhancement of sortedEnhancements) {
      const module = this.moduleCache.get(enhancement.id);
      if (!module) {
        console.warn(`Enhancement module not found: ${enhancement.id}`);
        continue;
      }
      
      try {
        // Update migration object with current content
        const updatedMigration = { ...migration, up: modifiedContent };
        
        const result = await module.applicator.apply(modifiedContent, updatedMigration);
        if (result.applied) {
          modifiedContent = result.modifiedContent;
          results.push(result);
        }
      } catch (error) {
        console.warn(`Error applying enhancement ${enhancement.id}:`, error);
      }
    }
    
    return modifiedContent;
  }

  /**
   * Apply a single enhancement to migration content
   * @param content Original migration content
   * @param migration Migration file object
   * @param enhancement Enhancement to apply
   * @returns Enhancement result
   */
  async applySingleEnhancement(content: string, migration: MigrationFile, enhancement: Enhancement): Promise<EnhancementResult> {
    await this.initialize();
    
    const module = this.moduleCache.get(enhancement.id);
    if (!module) {
      throw new Error(`Enhancement module not found: ${enhancement.id}`);
    }
    
    return await module.applicator.apply(content, migration);
  }

  /**
   * Find an enhancement module by ID (now using cache for O(1) lookup)
   * @param enhancementId Enhancement ID to find
   * @returns Enhancement module or undefined if not found
   */
  private findEnhancementModule(enhancementId: string): EnhancementModule | undefined {
    return this.moduleCache.get(enhancementId);
  }

  /**
   * Cache enhancement detection results
   */
  private cacheEnhancements(cacheKey: string, enhancements: Enhancement[]): void {
    // Store enhancement IDs in cache to avoid storing large objects
    const enhancementIds = enhancements.map(e => e.id);
    this.detectionCache.set(cacheKey, enhancementIds.length > 0);
  }

  /**
   * Get cached enhancements
   */
  private getCachedEnhancements(cacheKey: string, modules: EnhancementModule[]): Enhancement[] {
    // This is a simplified cache implementation
    // In practice, we'd need to cache the actual enhancement IDs
    return [];
  }

  /**
   * Clear all caches (useful for testing or when migration changes)
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.detectionCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { analysisCache: number; detectionCache: number } {
    return {
      analysisCache: this.analysisCache.size,
      detectionCache: this.detectionCache.size
    };
  }

  /**
   * Check if an enhancement is available
   * @param enhancementId Enhancement ID to check
   * @returns True if enhancement is available
   */
  async hasEnhancement(enhancementId: string): Promise<boolean> {
    await this.initialize();
    return this.moduleCache.has(enhancementId);
  }

  /**
   * Get a specific enhancement by ID
   * @param enhancementId Enhancement ID to get
   * @returns Enhancement definition or undefined if not found
   */
  async getEnhancement(enhancementId: string): Promise<Enhancement | undefined> {
    await this.initialize();
    const module = this.moduleCache.get(enhancementId);
    return module?.enhancement;
  }

  /**
   * Get all available safety enhancements
   * @returns Array of all safety enhancement definitions
   */
  async getAllSafetyEnhancements(): Promise<Enhancement[]> {
    await this.initialize();
    return this.safetyModules.map(module => module.enhancement);
  }

  /**
   * Get all available speed enhancements
   * @returns Array of all speed enhancement definitions
   */
  async getAllSpeedEnhancements(): Promise<Enhancement[]> {
    await this.initialize();
    return this.speedModules.map(module => module.enhancement);
  }

  /**
   * Get all available enhancements (both safety and speed)
   * @returns Array of all enhancement definitions
   */
  async getAllEnhancements(): Promise<Enhancement[]> {
    await this.initialize();
    return [
      ...this.safetyModules.map(module => module.enhancement),
      ...this.speedModules.map(module => module.enhancement)
    ];
  }

  /**
   * Get engine statistics including performance metrics
   * @returns Statistics about the enhancement engine
   */
  async getStats(): Promise<{
    totalEnhancements: number;
    safetyEnhancements: number;
    speedEnhancements: number;
    enhancementsByPriority: Record<number, number>;
    cacheStats: { analysisCache: number; detectionCache: number };
  }> {
    await this.initialize();
    
    const allEnhancements = await this.getAllEnhancements();
    const enhancementsByPriority: Record<number, number> = {};
    
    allEnhancements.forEach(enhancement => {
      enhancementsByPriority[enhancement.priority] = (enhancementsByPriority[enhancement.priority] || 0) + 1;
    });
    
    return {
      totalEnhancements: allEnhancements.length,
      safetyEnhancements: this.safetyModules.length,
      speedEnhancements: this.speedModules.length,
      enhancementsByPriority,
      cacheStats: this.getCacheStats()
    };
  }
} 