/**
 * Reusable prompt components for beautiful CLI interactions
 */

import { confirm, select, multiselect, text, spinner, log } from '@clack/prompts'
import colors from 'picocolors'

export interface EnhancementOption {
  value: string
  label: string
  hint?: string
  danger?: boolean
}

/**
 * Confirmation prompt with enhanced styling
 */
export async function confirmAction(
  message: string,
  options: any = {}
): Promise<boolean> {
  return await confirm({
    message: colors.cyan(message),
    ...options
  }) as boolean
}

/**
 * Selection prompt for single choice
 */
export async function selectOption<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>,
  selectOptions: any = {}
): Promise<T> {
  return await select({
    message: colors.cyan(message),
    options: options.map(opt => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint ? colors.dim(opt.hint) : undefined
    })),
    ...selectOptions
  }) as T
}

/**
 * Multi-selection prompt for multiple choices
 */
export async function selectMultiple<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string; required?: boolean }>,
  multiselectOptions: any = {}
): Promise<T[]> {
  return await multiselect({
    message: colors.cyan(message),
    options: options.map(opt => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint ? colors.dim(opt.hint) : undefined,
      required: opt.required
    })),
    ...multiselectOptions
  }) as T[]
}

/**
 * Text input prompt with validation
 */
export async function textInput(
  message: string,
  options: any = {}
): Promise<string> {
  return await text({
    message: colors.cyan(message),
    ...options
  }) as string
}

/**
 * Enhancement selection flow
 */
export async function selectEnhancements(
  availableEnhancements: EnhancementOption[]
): Promise<string[]> {
  log.info(colors.blue('🔍 Available migration enhancements:'))
  
  const options = availableEnhancements.map(enhancement => ({
    value: enhancement.value,
    label: enhancement.danger 
      ? colors.red(`⚠️  ${enhancement.label}`)
      : colors.green(`✅ ${enhancement.label}`),
    hint: enhancement.hint,
    required: false
  }))

  return await selectMultiple(
    'Select enhancements to apply:',
    options,
    {
      required: false
    }
  )
}

/**
 * Database connection confirmation
 */
export async function confirmDatabaseConnection(
  connectionString: string
): Promise<boolean> {
  log.info(colors.yellow('🔌 Database connection details:'))
  log.info(colors.dim(`   ${connectionString}`))
  
  return await confirmAction(
    'Proceed with this database connection?',
    {
      initialValue: false
    }
  )
}

/**
 * Migration risk confirmation
 */
export async function confirmHighRiskOperation(
  operationName: string,
  risks: string[]
): Promise<boolean> {
  log.warn(colors.red(`⚠️  HIGH RISK OPERATION: ${operationName}`))
  
  risks.forEach(risk => {
    log.warn(colors.red(`   • ${risk}`))
  })
  
  return await confirmAction(
    colors.red('Do you understand the risks and want to proceed?'),
    {
      initialValue: false
    }
  )
}

/**
 * Enhanced progress spinner with custom styling and animations
 */
export function createSpinner(message: string) {
  const s = spinner()
  
  return {
    start: (msg?: string) => {
      s.start(colors.blue(`🌊 ${msg || message}`))
      return {
        update: (newMessage: string) => s.message(colors.blue(`🌊 ${newMessage}`)),
        succeed: (successMessage?: string) => s.stop(colors.green(`✅ ${successMessage || 'Complete'}`)),
        fail: (errorMessage?: string) => s.stop(colors.red(`❌ ${errorMessage || 'Failed'}`)),
        stop: (finalMessage?: string) => s.stop(finalMessage ? colors.gray(finalMessage) : ''),
        message: (msg: string) => s.message(colors.blue(`🌊 ${msg}`))
      }
    }
  }
}

/**
 * Create a simple spinner with fluent API
 */
export function createFlowSpinner() {
  const s = spinner()
  let isStarted = false
  
  return {
    start: (message: string) => {
      if (!isStarted) {
        s.start(colors.blue(`🌊 ${message}`))
        isStarted = true
      }
      return {
        update: (msg: string) => s.message(colors.blue(`🌊 ${msg}`)),
        succeed: (msg?: string) => {
          s.stop(colors.green(`✅ ${msg || 'Complete'}`))
          isStarted = false
        },
        fail: (msg?: string) => {
          s.stop(colors.red(`❌ ${msg || 'Failed'}`))
          isStarted = false
        },
        stop: (msg?: string) => {
          s.stop(msg ? colors.gray(msg) : '')
          isStarted = false
        }
      }
    }
  }
}

/**
 * Display a success message with enhanced styling
 */
export function displaySuccess(message: string, details?: string[]): void {
  log.success(colors.green(`✅ ${message}`))
  if (details && details.length > 0) {
    details.forEach(detail => {
      log.info(colors.dim(`   • ${detail}`))
    })
  }
}

/**
 * Display an error message with enhanced styling
 */
export function displayError(message: string, details?: string[]): void {
  log.error(colors.red(`❌ ${message}`))
  if (details && details.length > 0) {
    details.forEach(detail => {
      log.info(colors.dim(`   • ${detail}`))
    })
  }
}

/**
 * Display a warning message with enhanced styling
 */
export function displayWarning(message: string, details?: string[]): void {
  log.warn(colors.yellow(`⚠️  ${message}`))
  if (details && details.length > 0) {
    details.forEach(detail => {
      log.info(colors.dim(`   • ${detail}`))
    })
  }
}

/**
 * Display an info message with enhanced styling
 */
export function displayInfo(message: string, details?: string[]): void {
  log.info(colors.blue(`ℹ️  ${message}`))
  if (details && details.length > 0) {
    details.forEach(detail => {
      log.info(colors.dim(`   • ${detail}`))
    })
  }
} 