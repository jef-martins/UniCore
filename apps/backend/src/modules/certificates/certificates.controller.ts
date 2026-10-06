import {
  BadRequestException,
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Public } from '../auth/public.decorator'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CertificatesService } from './certificates.service'
import { EventsAdvancedService } from './events-advanced.service'
import type {
  CreateCustomEventDto,
  CreateCustomParticipantDto,
  CreateEventArticleDto,
  CreateEventExpenseDto,
  CreateEventFeedbackDto,
  CreateEventRoomDto,
  CreateEventSponsorDto,
  CreateEventTicketDto,
  CreateEventWorkshopDto,
  CreateSponsorMovementDto,
  ReviewEventArticleDto,
  ScanAttendanceDto,
  UpdateCustomEventDto,
  UpdateEventWorkshopDto,
  UpdateParticipantStatusDto,
  ValidateTicketDto,
} from './dto/certificates.dto'

@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly eventsAdvancedService: EventsAdvancedService,
  ) {}

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
  @Public()
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
    @Query('type') type: 'logo' | 'template' | 'banner' | 'monitorTemplate' | 'articleTemplate' | 'pixQrCode',
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

  // ==========================================
  // CONSULTA INTELIGENTE DE CPF (UNIMESTRE + LOCAL)
  // ==========================================

  @Get('lookup-cpf/:cpf')
  @Public()
  lookupCpf(@Param('cpf') cpf: string) {
    return this.eventsAdvancedService.lookupCpf(cpf)
  }

  // ==========================================
  // INGRESSOS, TICKETS & BILHETERIA
  // ==========================================

  @Post('custom-events/:id/tickets')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  createTicket(
    @Param('id') eventId: string,
    @Body() dto: CreateEventTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.createTicket(eventId, req.user.sub, dto)
  }

  @Get('custom-events/:id/tickets')
  @Roles('admin', 'master', 'coordenacao', 'tesouraria')
  getEventTickets(
    @Param('id') eventId: string,
    @Query('status') status?: string,
  ) {
    return this.eventsAdvancedService.getEventTickets(eventId, status)
  }

  @Get('my-tickets')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  getMyTickets(@Req() req: AuthenticatedRequest) {
    return this.eventsAdvancedService.getMyTickets(req.user.sub)
  }

  @Get('tickets/:ticketId')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master', 'tesouraria')
  getTicketDetails(@Param('ticketId') ticketId: string) {
    return this.eventsAdvancedService.getTicketDetails(ticketId)
  }

  @Post('tickets/:ticketId/receipt')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadTicketReceipt(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.uploadTicketReceipt(ticketId, req.user.sub, file)
  }

  @Patch('tickets/:ticketId/validate')
  @Roles('admin', 'master', 'tesouraria', 'coordenacao')
  validateTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: ValidateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.validateTicket(ticketId, req.user.sub, dto)
  }

  @Post('tickets/cron-expire')
  @Roles('admin', 'master')
  cronExpireTickets() {
    return this.eventsAdvancedService.expirePendingTickets()
  }

  @Patch('tickets/:ticketId/switch-workshop')
  @Roles('admin', 'master', 'coordenacao', 'aluno', 'professor')
  switchWorkshop(
    @Param('ticketId') ticketId: string,
    @Body('workshopId') newWorkshopId: string,
  ) {
    return this.eventsAdvancedService.switchWorkshop(ticketId, newWorkshopId)
  }

  @Get('tickets/receipt/:fileName')
  @Public()
  getTicketReceiptFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const path = this.eventsAdvancedService.getFilePath('tickets', fileName)
    return res.sendFile(path)
  }

  // ==========================================
  // WORKSHOPS E TRANSAÇÃO ATÔMICA DE VAGAS
  // ==========================================

  @Get('custom-events/:id/workshops')
  @Public()
  getEventWorkshops(@Param('id') eventId: string) {
    return this.eventsAdvancedService.getEventWorkshops(eventId)
  }

  @Post('custom-events/:id/workshops')
  @Roles('admin', 'master', 'coordenacao')
  createWorkshop(
    @Param('id') eventId: string,
    @Body() dto: CreateEventWorkshopDto,
  ) {
    return this.eventsAdvancedService.createWorkshop(eventId, dto)
  }

  @Put('workshops/:workshopId')
  @Roles('admin', 'master', 'coordenacao')
  updateWorkshop(
    @Param('workshopId') workshopId: string,
    @Body() dto: UpdateEventWorkshopDto,
  ) {
    return this.eventsAdvancedService.updateWorkshop(workshopId, dto)
  }

  @Delete('workshops/:workshopId')
  @Roles('admin', 'master', 'coordenacao')
  deleteWorkshop(@Param('workshopId') workshopId: string) {
    return this.eventsAdvancedService.deleteWorkshop(workshopId)
  }

  // ==========================================
  // SUBMISSÃO E AVALIAÇÃO DE ARTIGOS CIENTÍFICOS
  // ==========================================

  @Get('custom-events/:id/eligible-coauthors')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  getEligibleCoauthors(
    @Param('id') eventId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.getEligibleCoauthors(eventId, req.user.sub)
  }

  @Post('custom-events/:id/articles')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'docFile', maxCount: 1 },
        { name: 'pdfFile', maxCount: 1 },
      ],
      { limits: { fileSize: 20 * 1024 * 1024 } },
    ),
  )
  submitArticle(
    @Param('id') eventId: string,
    @Body() dto: CreateEventArticleDto,
    @UploadedFiles() files: { docFile?: Express.Multer.File[]; pdfFile?: Express.Multer.File[] },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!files?.docFile?.[0]) {
      throw new BadRequestException('O arquivo DOC/DOCX é obrigatório para submissão.')
    }
    return this.eventsAdvancedService.submitArticle(
      eventId,
      req.user.sub,
      dto,
      files.docFile[0],
      files.pdfFile?.[0],
    )
  }

  @Get('custom-events/:id/articles')
  @Roles('admin', 'master', 'coordenacao', 'professor')
  listEventArticles(
    @Param('id') eventId: string,
    @Query('status') status?: string,
  ) {
    return this.eventsAdvancedService.listEventArticles(eventId, status)
  }

  @Get('my-articles')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  getMyArticles(@Req() req: AuthenticatedRequest) {
    return this.eventsAdvancedService.getMyArticles(req.user.sub)
  }

  @Patch('articles/:articleId/lock')
  @Roles('admin', 'master', 'coordenacao', 'professor')
  lockArticle(
    @Param('articleId') articleId: string,
    @Body('lock') lock: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.lockArticle(articleId, req.user.sub, Boolean(lock))
  }

  @Patch('articles/:articleId/review')
  @Roles('admin', 'master', 'coordenacao', 'professor')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'plagioFile', maxCount: 1 },
        { name: 'correcaoFile', maxCount: 1 },
      ],
      { limits: { fileSize: 20 * 1024 * 1024 } },
    ),
  )
  reviewArticle(
    @Param('articleId') articleId: string,
    @Body() dto: ReviewEventArticleDto,
    @UploadedFiles() files: { plagioFile?: Express.Multer.File[]; correcaoFile?: Express.Multer.File[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.reviewArticle(
      articleId,
      req.user.sub,
      dto,
      files?.plagioFile?.[0],
      files?.correcaoFile?.[0],
    )
  }

  @Get('committee')
  @Roles('admin', 'master', 'coordenacao')
  getCommitteeMembers() {
    return this.eventsAdvancedService.getCommitteeMembers()
  }

  @Patch('users/:userId/evaluator')
  @Roles('admin', 'master', 'coordenacao')
  toggleArticleEvaluator(
    @Param('userId') userId: string,
    @Body('isEvaluator') isEvaluator: boolean,
  ) {
    return this.eventsAdvancedService.toggleArticleEvaluator(userId, Boolean(isEvaluator))
  }

  @Get('articles/file/:fileName')
  @Public()
  getArticleFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const path = this.eventsAdvancedService.getFilePath('articles', fileName)
    return res.sendFile(path)
  }

  // ==========================================
  // SALAS FÍSICAS E PORTARIA COM SCANNER
  // ==========================================

  @Get('rooms')
  @Roles('admin', 'master', 'coordenacao', 'professor')
  getRooms() {
    return this.eventsAdvancedService.getRooms()
  }

  @Post('rooms')
  @Roles('admin', 'master', 'coordenacao')
  createRoom(@Body() dto: CreateEventRoomDto) {
    return this.eventsAdvancedService.createRoom(dto)
  }

  @Delete('rooms/:roomId')
  @Roles('admin', 'master', 'coordenacao')
  deleteRoom(@Param('roomId') roomId: string) {
    return this.eventsAdvancedService.deleteRoom(roomId)
  }

  @Post('attendance/scan')
  @Roles('admin', 'master', 'coordenacao', 'professor')
  scanAttendance(
    @Body() dto: ScanAttendanceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'master' || req.user.role === 'coordenacao'
    return this.eventsAdvancedService.scanAttendance(dto, req.user.sub, isAdmin)
  }

  @Get('custom-events/:id/attendances')
  @Roles('admin', 'master', 'coordenacao')
  getEventAttendances(@Param('id') eventId: string) {
    return this.eventsAdvancedService.getEventAttendances(eventId)
  }

  // ==========================================
  // FINANÇAS, DESPESAS E PATROCINADORES
  // ==========================================

  @Get('custom-events/:id/finances')
  @Roles('admin', 'master', 'coordenacao', 'tesouraria')
  getFinancialSummary(@Param('id') eventId: string) {
    return this.eventsAdvancedService.getFinancialSummary(eventId)
  }

  @Get('custom-events/:id/expense-groups')
  @Roles('admin', 'master', 'tesouraria', 'coordenacao')
  getFinancialGroups(@Param('id') eventId: string) {
    return this.eventsAdvancedService.getFinancialGroups(eventId)
  }

  @Post('custom-events/:id/expense-groups')
  @Roles('admin', 'master', 'tesouraria')
  createFinancialGroup(
    @Param('id') eventId: string,
    @Body('name') name: string,
  ) {
    return this.eventsAdvancedService.createFinancialGroup(eventId, name)
  }

  @Post('custom-events/:id/expenses')
  @Roles('admin', 'master', 'tesouraria')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  addExpense(
    @Param('id') eventId: string,
    @Body() dto: CreateEventExpenseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.eventsAdvancedService.addExpense(eventId, dto, file)
  }

  @Delete('expenses/:expenseId')
  @Roles('admin', 'master', 'tesouraria')
  deleteExpense(@Param('expenseId') expenseId: string) {
    return this.eventsAdvancedService.deleteExpense(expenseId)
  }

  @Get('expenses/receipt/:fileName')
  @Public()
  getExpenseReceiptFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const path = this.eventsAdvancedService.getFilePath('expenses', fileName)
    return res.sendFile(path)
  }

  @Post('custom-events/:id/sponsors')
  @Roles('admin', 'master', 'tesouraria')
  addSponsor(
    @Param('id') eventId: string,
    @Body() dto: CreateEventSponsorDto,
  ) {
    return this.eventsAdvancedService.addSponsor(eventId, dto)
  }

  @Post('sponsors/:sponsorId/movements')
  @Roles('admin', 'master', 'tesouraria')
  addSponsorMovement(
    @Param('sponsorId') sponsorId: string,
    @Body() dto: CreateSponsorMovementDto,
  ) {
    return this.eventsAdvancedService.addSponsorMovement(sponsorId, dto)
  }

  // ==========================================
  // PESQUISA DE SATISFAÇÃO (FEEDBACK)
  // ==========================================

  @Post('custom-events/:id/feedbacks')
  @Roles('aluno', 'professor', 'coordenacao', 'admin', 'master')
  submitFeedback(
    @Param('id') eventId: string,
    @Body() dto: CreateEventFeedbackDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsAdvancedService.submitFeedback(eventId, req.user.sub, dto)
  }

  @Get('custom-events/:id/feedbacks')
  @Roles('admin', 'master', 'coordenacao')
  getEventFeedbacks(@Param('id') eventId: string) {
    return this.eventsAdvancedService.getEventFeedbacks(eventId)
  }

  // ==========================================
  // RELATÓRIOS E EXPORTAÇÃO EXCEL (FASE 4)
  // ==========================================

  @Get('custom-events/:id/export/:reportType')
  @Roles('admin', 'master', 'coordenacao')
  async exportEventReport(
    @Param('id') eventId: string,
    @Param('reportType') reportType: string,
    @Res() res: Response,
  ) {
    const buffer = await this.eventsAdvancedService.exportReport(eventId, reportType)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio_${reportType}_${eventId}.xlsx"`,
    )
    res.end(buffer)
  }
}
