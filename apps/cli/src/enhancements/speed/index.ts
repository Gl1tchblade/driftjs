/**
 * Speed Enhancements Index
 * Loads and exports all speed enhancement modules
 */

import { EnhancementModule } from '../../core/types.js';

// Import all speed enhancement modules  
import { 
  batchInsertModule,
  concurrentIndexModule, // DISABLED: User requested no indexing in speed enhancements
  partialIndexModule, // DISABLED: User requested no indexing in speed enhancements
  indexOptimizationModule, // DISABLED: User requested no indexing in speed enhancements
  queryOptimizationModule,
  bulkUpdateModule,
  connectionPoolingModule,
  vacuumAnalyzeModule,
  parallelExecutionModule,
  compressionModule,
  statisticsUpdateModule,
  cacheOptimizationModule
} from './remaining-stubs.js';

/**
 * Load all speed enhancement modules
 * @returns Array of all speed enhancement modules
 */
export async function loadSpeedEnhancements(): Promise<EnhancementModule[]> {
  return [
    batchInsertModule,
    concurrentIndexModule, // DISABLED: User requested no indexing in speed enhancements  
    partialIndexModule, // DISABLED: User requested no indexing in speed enhancements
    indexOptimizationModule, // DISABLED: User requested no indexing in speed enhancements
    queryOptimizationModule,
    bulkUpdateModule,
    connectionPoolingModule,
    vacuumAnalyzeModule,
    parallelExecutionModule,
    compressionModule,
    statisticsUpdateModule,
    cacheOptimizationModule,
  ];
}

/**
 * Get all speed enhancement IDs
 * @returns Array of speed enhancement IDs
 */
export async function getSpeedEnhancementIds(): Promise<string[]> {
  const modules = await loadSpeedEnhancements();
  return modules.map(module => module.enhancement.id);
}

/**
 * Get speed enhancement module by ID
 * @param id Enhancement ID
 * @returns Enhancement module or undefined
 */
export async function getSpeedEnhancementModule(id: string): Promise<EnhancementModule | undefined> {
  const modules = await loadSpeedEnhancements();
  return modules.find(module => module.enhancement.id === id);
} 