import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('databaseUrl')
    const poolConfig = connectionString
      ? { connectionString }
      : {
          host: config.get<string>('databaseHost', 'localhost'),
          port: config.get<number>('databasePort', 5432),
          database: config.get<string>('databaseName', 'unicore'),
          user: config.get<string>('databaseUser', 'postgres'),
          password: config.get<string>('databasePassword', ''),
        }

    this.pool = new Pool({
      ...poolConfig,
      max: config.get<number>('databasePoolMax', 10),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    })

    this.pool.on('error', () => {
      console.error('UniCore: erro inesperado no pool PostgreSQL.')
    })
  }

  async checkConnection(): Promise<void> {
    await this.pool.query('SELECT 1')
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end()
  }
}
