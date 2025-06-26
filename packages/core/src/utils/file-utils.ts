/**
 * File system utilities for DriftJS
 */

import fs from 'fs-extra'
const { readFile, writeFile, access, stat, readdir } = fs
import { join, resolve, relative, dirname } from 'path'
import { FilePath, Result } from '../types/common.js'

/**
 * Check if a file or directory exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Create a FilePath object with absolute and relative paths
 */
export async function createFilePath(path: string, basePath: string = process.cwd()): Promise<FilePath> {
  const absolutePath = resolve(basePath, path)
  const relativePath = relative(basePath, absolutePath)
  const fileExists = await exists(absolutePath)
  
  return {
    absolute: absolutePath,
    relative: relativePath,
    exists: fileExists
  }
}

/**
 * Read file content with error handling
 */
export async function readFileContent(path: string): Promise<Result<string>> {
  try {
    const content = await readFile(path, 'utf-8')
    return { success: true, data: content }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error reading file')
    }
  }
}

/**
 * Write file content with error handling
 */
export async function writeFileContent(path: string, content: string): Promise<Result<void>> {
  try {
    await writeFile(path, content, 'utf-8')
    return { success: true, data: undefined }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error writing file')
    }
  }
}

/**
 * Get file statistics
 */
export async function getFileStats(path: string): Promise<Result<{ size: number; modified: Date; isDirectory: boolean }>> {
  try {
    const stats = await stat(path)
    return {
      success: true,
      data: {
        size: stats.size,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error getting file stats')
    }
  }
}

/**
 * Find files matching a pattern in a directory
 */
export async function findFiles(
  directory: string,
  pattern: RegExp,
  recursive: boolean = true
): Promise<string[]> {
  const files: string[] = []
  
  try {
    const items = await readdir(directory, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = join(directory, item.name)
      
      if (item.isDirectory() && recursive) {
        const subFiles = await findFiles(fullPath, pattern, recursive)
        files.push(...subFiles)
      } else if (item.isFile() && pattern.test(item.name)) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  
  return files
}

/**
 * Check if a directory contains any files matching a pattern
 */
export async function hasFilesMatching(directory: string, pattern: RegExp): Promise<boolean> {
  const files = await findFiles(directory, pattern, false)
  return files.length > 0
}

/**
 * Parse JSON file with error handling
 */
export async function readJsonFile<T = any>(path: string): Promise<Result<T>> {
  const fileResult = await readFileContent(path)
  
  if (!fileResult.success) {
    return fileResult
  }
  
  try {
    const data = JSON.parse(fileResult.data)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: new Error(`Invalid JSON in file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
} 