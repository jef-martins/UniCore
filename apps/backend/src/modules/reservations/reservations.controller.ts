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
  CreateReservationDto,
  UpdateItemDto,
  UpdateItemStatusDto,
} from './dto/reservations.dto'
import { ReservationsService } from './reservations.service'

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master', 'professor')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('stats')
  getStats() {
    return this.reservationsService.getStats()
  }

  @Get('items')
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

  @Get()
  getReservations(@Query('status') status?: ReservationStatus) {
    return this.reservationsService.getReservations(status)
  }

  @Post()
  createReservation(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(request.user.sub, body)
  }

  @Patch(':id/complete')
  completeReservation(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.completeReservation(id)
  }

  @Patch(':id/cancel')
  cancelReservation(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.cancelReservation(id)
  }
}
