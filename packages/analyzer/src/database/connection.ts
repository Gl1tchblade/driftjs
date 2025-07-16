/**
 * Database connection management
 * Handles PostgreSQL, MySQL, and SQLite connections with pooling and timeout management
 */

import { DatabaseConnection, DatabaseConfig } from '@driftjs/core'

/**
 * PostgreSQL connection implementation
 */
export class PostgreSQLConnection implements DatabaseConnection {
  type = 'postgresql' as const
  isConnected = false
  private client: any = null
  private config: DatabaseConfig
  
  constructor(config: DatabaseConfig) {
    this.config = config
  }
  
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      let Client
      try {
        ({ Client } = await import('pg'))
      } catch (importError) {
        throw new Error('pg is not installed. Please install it with: npm install pg')
      }
      
      this.client = new Client({
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        connectionTimeoutMillis: 10000, // 10 seconds
        query_timeout: 30000, // 30 seconds
      })
      
      await this.client.connect()
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect to PostgreSQL: ${error}`)
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end()
        this.client = null
      }
      this.isConnected = false
    } catch (error) {
      console.warn(`Error disconnecting from PostgreSQL: ${error}`)
      this.isConnected = false
    }
  }
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Database not connected')
    }
    
    try {
      const result = await this.client.query(sql, params)
      return result.rows
    } catch (error) {
      throw new Error(`Query failed: ${error}`)
    }
  }
  
  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    if (!this.isConnected || !this.client) {
      throw new Error('Database not connected')
    }
    
    try {
      await this.client.query('BEGIN')
      const result = await callback(this)
      await this.client.query('COMMIT')
      return result
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }
}

/**
 * MySQL connection implementation
 */
export class MySQLConnection implements DatabaseConnection {
  type = 'mysql' as const
  isConnected = false
  private connection: any = null
  private config: DatabaseConfig
  
  constructor(config: DatabaseConfig) {
    this.config = config
  }
  
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      let mysql
      try {
        mysql = await import('mysql2/promise')
      } catch (importError) {
        throw new Error('mysql2 is not installed. Please install it with: npm install mysql2')
      }
      
             this.connection = await mysql.createConnection({
         host: this.config.host,
         port: this.config.port || 3306,
         database: this.config.database,
         user: this.config.username,
         password: this.config.password,
         ssl: typeof this.config.ssl === 'boolean' ? undefined : this.config.ssl
       })
      
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect to MySQL: ${error}`)
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.end()
        this.connection = null
      }
      this.isConnected = false
    } catch (error) {
      console.warn(`Error disconnecting from MySQL: ${error}`)
      this.isConnected = false
    }
  }
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected || !this.connection) {
      throw new Error('Database not connected')
    }
    
    try {
      const [rows] = await this.connection.execute(sql, params)
      return Array.isArray(rows) ? rows : []
    } catch (error) {
      throw new Error(`Query failed: ${error}`)
    }
  }
  
  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    if (!this.isConnected || !this.connection) {
      throw new Error('Database not connected')
    }
    
    try {
      await this.connection.beginTransaction()
      const result = await callback(this)
      await this.connection.commit()
      return result
    } catch (error) {
      await this.connection.rollback()
      throw error
    }
  }
}

/**
 * SQLite connection implementation
 */
export class SQLiteConnection implements DatabaseConnection {
  type = 'sqlite' as const
  isConnected = false
  private db: any = null
  private config: DatabaseConfig
  
  constructor(config: DatabaseConfig) {
    this.config = config
  }
  
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      let Database
      try {
        Database = (await import('better-sqlite3')).default
      } catch (importError) {
        throw new Error('better-sqlite3 is not installed. Please install it with: npm install better-sqlite3')
      }
      
      const dbPath = this.config.database || 'database.sqlite'
             this.db = new Database(dbPath, {
         timeout: 10000 // 10 seconds
       })
      
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect to SQLite: ${error}`)
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        this.db.close()
        this.db = null
      }
      this.isConnected = false
    } catch (error) {
      console.warn(`Error disconnecting from SQLite: ${error}`)
      this.isConnected = false
    }
  }
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected')
    }
    
    try {
      const stmt = this.db.prepare(sql)
      const result = params ? stmt.all(params) : stmt.all()
      return Array.isArray(result) ? result : []
    } catch (error) {
      throw new Error(`Query failed: ${error}`)
    }
  }
  
  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected')
    }
    
    const transaction = this.db.transaction(async () => {
      return await callback(this)
    })
    
    return transaction()
  }
}

/**
 * Database connection factory
 * Creates the appropriate connection based on database type
 */
export async function createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLConnection(config)
    case 'mysql':
      return new MySQLConnection(config)
    case 'sqlite':
      return new SQLiteConnection(config)
    default:
      throw new Error(`Unsupported database type: ${config.type}`)
  }
}

/**
 * Test database connection with proper error handling and timeout
 */
export async function testConnection(config: DatabaseConfig, timeoutMs: number = 10000): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now()
  let connection: DatabaseConnection | null = null
  
  try {
    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
    })
    
    // Attempt connection with timeout
    connection = await createConnection(config)
    await Promise.race([connection.connect(), timeoutPromise])
    
    // Test with a simple query
    const testQuery = config.type === 'postgresql' 
      ? 'SELECT 1 as test' 
      : config.type === 'mysql'
      ? 'SELECT 1 as test'
      : 'SELECT 1 as test'
    
    await connection.query(testQuery)
    
    const latency = Date.now() - startTime
    
    return {
      success: true,
      latency
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    if (connection) {
      try {
        await connection.disconnect()
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Connection pool manager for efficient connection reuse
 */
export class ConnectionPool {
  private pools = new Map<string, DatabaseConnection[]>()
  private maxPoolSize = 5
  private minPoolSize = 1
  
  constructor(options?: { maxPoolSize?: number; minPoolSize?: number }) {
    this.maxPoolSize = options?.maxPoolSize || 5
    this.minPoolSize = options?.minPoolSize || 1
  }
  
  private getPoolKey(config: DatabaseConfig): string {
    return `${config.type}://${config.host}:${config.port}/${config.database}`
  }
  
  async getConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
    const key = this.getPoolKey(config)
    let pool = this.pools.get(key)
    
    if (!pool) {
      pool = []
      this.pools.set(key, pool)
    }
    
    // Try to get an existing connection from pool
    const connection = pool.pop()
    if (connection && connection.isConnected) {
      return connection
    }
    
    // Create new connection if pool is empty
    const newConnection = await createConnection(config)
    await newConnection.connect()
    return newConnection
  }
  
  async releaseConnection(config: DatabaseConfig, connection: DatabaseConnection): Promise<void> {
    const key = this.getPoolKey(config)
    const pool = this.pools.get(key) || []
    
    if (pool.length < this.maxPoolSize && connection.isConnected) {
      pool.push(connection)
      this.pools.set(key, pool)
    } else {
      await connection.disconnect()
    }
  }
  
  async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await Promise.all(pool.map(conn => conn.disconnect()))
    }
    this.pools.clear()
  }
} 