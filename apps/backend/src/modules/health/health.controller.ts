import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

interface HealthResponse {
  status: 'ok'
  service: string
  database: 'up'
  timestamp: string
}

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    try {
      await this.databaseService.checkConnection()
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'unicore-backend',
        database: 'down',
        timestamp: new Date().toISOString(),
      })
    }

    return {
      status: 'ok',
      service: 'unicore-backend',
      database: 'up',
      timestamp: new Date().toISOString(),
    }
  }
}
