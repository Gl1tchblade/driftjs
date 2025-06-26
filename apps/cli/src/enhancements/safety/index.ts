/**
 * Safety Enhancements Index
 * Loads and exports all safety enhancement modules
 */

import { EnhancementModule } from '../../core/types.js';

// Import all safety enhancement modules
import { transactionWrapperModule } from './transaction-wrapper.js';
import { dropTableSafeguardModule } from './drop-table-safeguard.js';
import { foreignKeyConstraintModule } from './foreign-key-constraint.js';
import { nullableColumnModule } from './nullable-column.js';
import { indexCreationModule } from './index-creation.js';
import { dataTypeChangeModule } from './data-type-change.js';
import { columnRenamingModule } from './column-renaming.js';
import { cascadeDeleteModule } from './cascade-delete.js';
import { uniqueConstraintModule } from './unique-constraint.js';
import { checkConstraintModule } from './check-constraint.js';
import { backupRecommendationModule } from './backup-recommendation.js';
import { migrationOrderModule } from './migration-order.js';

/**
 * Load all safety enhancement modules
 * @returns Array of all safety enhancement modules
 */
export async function loadSafetyEnhancements(): Promise<EnhancementModule[]> {
  return [
    transactionWrapperModule,
    dropTableSafeguardModule,
    foreignKeyConstraintModule,
    nullableColumnModule,
    indexCreationModule,
    dataTypeChangeModule,
    columnRenamingModule,
    cascadeDeleteModule,
    uniqueConstraintModule,
    checkConstraintModule,
    backupRecommendationModule,
    migrationOrderModule,
  ];
}

/**
 * Get all safety enhancement IDs
 * @returns Array of safety enhancement IDs
 */
export async function getSafetyEnhancementIds(): Promise<string[]> {
  const modules = await loadSafetyEnhancements();
  return modules.map(module => module.enhancement.id);
}

/**
 * Get safety enhancement module by ID
 * @param id Enhancement ID
 * @returns Enhancement module or undefined
 */
export async function getSafetyEnhancementModule(id: string): Promise<EnhancementModule | undefined> {
  const modules = await loadSafetyEnhancements();
  return modules.find(module => module.enhancement.id === id);
} 