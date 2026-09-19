import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { TerritoriesController } from './territories.controller'
import { TerritoriesService } from './territories.service'

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TerritoriesController],
  providers: [TerritoriesService],
  exports: [TerritoriesService],
})
export class TerritoriesModule {}
