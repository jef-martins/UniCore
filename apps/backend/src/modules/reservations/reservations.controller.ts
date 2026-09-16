import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ItemCondition, ItemStatus, ReservationStatus } from '@prisma/client'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import {
  CreateItemDto,
  CreateItemEvaluationDto,
  CreateMaintenanceDto,
  CreateReservationDto,
  UpdateItemDto,
  UpdateItemStatusDto,
  UpdateMaintenanceDto,
} from './dto/reservations.dto'
import { ReservationsService } from './reservations.service'

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master', 'professor', 'aluno')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('stats')
  @Roles('admin', 'master', 'professor')
  getStats() {
    return this.reservationsService.getStats()
  }

  @Get('dashboard')
  @Roles('admin', 'master')
  getDashboard() {
    return this.reservationsService.getDashboardStats()
  }

  // --- SALAS & LABORATÓRIOS (CONSULTA POR ALUNOS E OUTROS PERFIS) ---
  @Get('rooms')
  @Roles('aluno', 'professor', 'admin', 'master')
  getRooms() {
    return this.reservationsService.getRoomsWithStats()
  }

  @Get('rooms/:location/items')
  @Roles('aluno', 'professor', 'admin', 'master')
  getItemsByRoom(@Param('location') location: string) {
    return this.reservationsService.getItemsByRoom(decodeURIComponent(location))
  }

  // --- AVALIAÇÕES DE ITENS POR ALUNOS ---
  @Post('items/:id/evaluations')
  @Roles('aluno', 'professor', 'admin', 'master')
  createEvaluation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateItemEvaluationDto,
  ) {
    return this.reservationsService.createEvaluation(id, request.user?.sub, body)
  }

  @Get('items/:id/evaluations')
  @Roles('aluno', 'professor', 'admin', 'master')
  getItemEvaluations(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.getItemEvaluations(id)
  }

  // --- MANUTENÇÕES PREVENTIVAS E CORRETIVAS ---
  @Get('maintenances')
  @Roles('admin', 'master')
  getMaintenances(@Query('itemId') itemId?: string) {
    return this.reservationsService.getMaintenances(itemId)
  }

  @Get('items/:id/maintenances')
  @Roles('admin', 'master')
  getItemMaintenances(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.getMaintenances(id)
  }

  @Post('items/:id/maintenances')
  @Roles('admin', 'master')
  createMaintenance(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateMaintenanceDto,
  ) {
    return this.reservationsService.createMaintenance(id, body)
  }

  @Patch('maintenances/:id')
  @Roles('admin', 'master')
  updateMaintenance(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMaintenanceDto,
  ) {
    return this.reservationsService.updateMaintenance(id, body)
  }

  // --- ITENS DE RESERVA ---
  @Get('items')
  @Roles('admin', 'master', 'professor')
  getItems(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: ItemStatus,
    @Query('condition') condition?: ItemCondition,
  ) {
    return this.reservationsService.getItems(search, category, status, condition)
  }

  @Post('items')
  @Roles('admin', 'master')
  createItem(@Body() body: CreateItemDto) {
    return this.reservationsService.createItem(body)
  }

  @Patch('items/:id')
  @Roles('admin', 'master')
  updateItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateItemDto,
  ) {
    return this.reservationsService.updateItem(id, body)
  }

  @Patch('items/:id/status')
  @Roles('admin', 'master')
  updateItemStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateItemStatusDto,
  ) {
    return this.reservationsService.updateItemStatus(id, body.status)
  }

  @Delete('items/:id')
  @Roles('admin', 'master')
  deleteItem(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.deleteItem(id)
  }

  // --- RESERVAS ---
  @Get()
  @Roles('admin', 'master', 'professor')
  getReservations(@Query('status') status?: ReservationStatus) {
    return this.reservationsService.getReservations(status)
  }

  @Post()
  @Roles('admin', 'master', 'professor')
  createReservation(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(request.user.sub, body)
  }

  @Patch(':id/complete')
  @Roles('admin', 'master', 'professor')
  completeReservation(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.completeReservation(id)
  }

  @Patch(':id/cancel')
  @Roles('admin', 'master', 'professor')
  cancelReservation(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.cancelReservation(id)
  }
}

