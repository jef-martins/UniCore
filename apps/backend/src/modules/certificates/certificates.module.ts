import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { CertificatesController } from './certificates.controller'
import { CertificatesService } from './certificates.service'

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
