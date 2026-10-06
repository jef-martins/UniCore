import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { CertificatesController } from './certificates.controller'
import { CertificatesService } from './certificates.service'
import { EventsAdvancedService } from './events-advanced.service'
import { EventsMailerService } from './events-mailer.service'

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, EventsAdvancedService, EventsMailerService],
  exports: [CertificatesService, EventsAdvancedService, EventsMailerService],
})
export class CertificatesModule {}
