import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { UnimestreController } from './unimestre.controller'
import { UnimestreService } from './unimestre.service'

@Module({
  imports: [AuthModule],
  controllers: [UnimestreController],
  providers: [UnimestreService],
})
export class UnimestreModule {}
