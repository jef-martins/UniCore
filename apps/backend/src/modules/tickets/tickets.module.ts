import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
