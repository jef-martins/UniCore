import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CertificatesService } from './certificates.service'
import type {
  CreateCustomEventDto,
  CreateCustomParticipantDto,
  UpdateCustomEventDto,
  UpdateParticipantStatusDto,
} from './dto/certificates.dto'

@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ==========================================
  // CATÁLOGO PÚBLICO / ACADÊMICO DE EVENTOS
  // ==========================================

  @Get('catalog')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master', 'secretaria', 'tesouraria', 'registro_academico', 'vestibular')
  getEventsCatalog(@Req() req: AuthenticatedRequest) {
    return this.certificatesService.getEventsCatalog(req.user)
  }

  @Get('my-certificate/:participantId')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master', 'secretaria', 'tesouraria', 'registro_academico', 'vestibular')
  getMyCertificate(
    @Param('participantId') participantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificatesService.getMyCertificate(participantId, req.user)
  }

  @Get('custom-events/:id/assets/:fileName')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master', 'secretaria', 'tesouraria', 'registro_academico', 'vestibular')
  getEventAsset(@Param('fileName') fileName: string, @Res() res: Response) {
    const path = this.certificatesService.getEventAssetPath(fileName)
    return res.sendFile(path)
  }

  // ==========================================
  // UNIMESTRE / EVENTOS LEGADOS
  // ==========================================

  @Get('years')
  getYears() {
    return this.certificatesService.getYears()
  }

  @Get('courses')
  getCourses() {
    return this.certificatesService.getCourses()
  }

  @Get('events')
  getEvents(
    @Query('year') year?: string,
    @Query('course') course?: string,
  ) {
    const yearNum = year ? Number.parseInt(year, 10) : undefined
    return this.certificatesService.getEvents(yearNum, course)
  }

  @Get('inscriptions')
  searchInscriptions(
    @Query('ano') ano?: string,
    @Query('curso') curso?: string,
    @Query('evento') evento?: string,
    @Query('busca') busca?: string,
  ) {
    return this.certificatesService.searchInscriptions({ ano, curso, evento, busca })
  }

  @Get('document/:inscricaoId')
  getCertificateDocument(
    @Param('inscricaoId') inscricaoId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificatesService.getCertificateDocument(inscricaoId, req.user?.sub)
  }

  @Get('logs')
  getLogs(@Query('inscricaoId') inscricaoId?: string) {
    return this.certificatesService.getLogs(inscricaoId)
  }

  // ==========================================
  // EVENTOS E PARTICIPANTES CUSTOMIZADOS (UniCore)
  // ==========================================

  @Post('custom-events')
  createCustomEvent(
    @Body() dto: CreateCustomEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificatesService.createCustomEvent(dto, req.user?.sub)
  }

  @Get('custom-events')
  listCustomEvents(@Query('search') search?: string) {
    return this.certificatesService.listCustomEvents(search)
  }

  @Get('custom-events/:id')
  getCustomEventById(@Param('id') id: string) {
    return this.certificatesService.getCustomEventById(id)
  }

  @Put('custom-events/:id')
  updateCustomEvent(
    @Param('id') id: string,
    @Body() dto: UpdateCustomEventDto,
  ) {
    return this.certificatesService.updateCustomEvent(id, dto)
  }

  @Delete('custom-events/:id')
  deleteCustomEvent(@Param('id') id: string) {
    return this.certificatesService.deleteCustomEvent(id)
  }

  @Post('custom-events/:id/assets')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadEventAsset(
    @Param('id') id: string,
    @Query('type') type: 'logo' | 'template',
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.certificatesService.saveEventAsset(id, type, file)
  }

  @Post('custom-events/:id/participants')
  addParticipant(
    @Param('id') id: string,
    @Body() dto: CreateCustomParticipantDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificatesService.addParticipant(id, dto, req.user?.sub)
  }

  @Patch('participants/:id/status')
  updateParticipantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateParticipantStatusDto,
  ) {
    return this.certificatesService.updateParticipantStatus(id, dto)
  }

  @Delete('participants/:id')
  removeParticipant(@Param('id') id: string) {
    return this.certificatesService.removeParticipant(id)
  }

  @Get('participants/:id/document')
  getParticipantCertificateDocument(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.certificatesService.getParticipantCertificateDocument(id, req.user?.sub)
  }
}
