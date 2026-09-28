import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import 'multer'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { CreateTicketDto } from './dto/create-ticket.dto'
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'
import { TicketsService } from './tickets.service'

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('sector') sector?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('code') code?: string,
  ) {
    return this.ticketsService.findAll(request.user, { sector, status, priority, search, userId, code })
  }

  @Get('dashboard')
  getDashboardStats(
    @Req() request: AuthenticatedRequest,
    @Query('sector') sector?: string,
    @Query('days') days?: number,
    @Query('userId') userId?: string,
  ) {
    return this.ticketsService.getDashboardStats(request.user, { sector, days, userId })
  }

  @Get('users')
  getUsers() {
    return this.ticketsService.getUsers()
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest) {
    return this.ticketsService.findById(id, request.user)
  }

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 10, { limits: { fileSize: 25 * 1024 * 1024 } }))
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateTicketDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.ticketsService.create(request.user, body, files)
  }

  @Post(':id/messages')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 25 * 1024 * 1024 } }))
  addMessage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateTicketMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.ticketsService.addMessage(id, request.user, body, file)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, request.user, body)
  }

  @Get(':id/attachments/:attachmentId')
  async getAttachment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const { path, filename, mimeType } = await this.ticketsService.getAttachment(id, attachmentId, request.user)
    response.setHeader('Content-Type', mimeType)
    return response.download(path, filename)
  }

  @Get('messages/:messageId/attachment')
  async getMessageAttachment(
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const { path, filename, mimeType } = await this.ticketsService.getMessageAttachment(messageId, request.user)
    response.setHeader('Content-Type', mimeType)
    return response.download(path, filename)
  }
}
