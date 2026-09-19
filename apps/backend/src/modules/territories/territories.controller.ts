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
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import {
  BatchCreateResidenceNumbersDto,
  CreateLeadDto,
  CreateNeighborhoodDto,
  CreateResidenceNumberDto,
  CreateStreetDto,
  CreateSubterritoryDto,
  CreateTerritoryDto,
  LeadQueryDto,
  UpdateLeadDto,
  UpdateNeighborhoodDto,
  UpdateResidenceNumberDto,
  UpdateStreetDto,
  UpdateSubterritoryDto,
  UpdateTerritoryDto,
} from './dto/territories.dto'
import { TerritoriesService } from './territories.service'

@Controller('territories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master', 'vestibular')
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  // --- TERRITÓRIOS ---
  @Get()
  getTerritories() {
    return this.territoriesService.getTerritories()
  }

  @Get('dashboard')
  getDashboardStats(@Query() query: LeadQueryDto) {
    return this.territoriesService.getDashboardStats(query)
  }

  @Get('leads')
  getLeads(@Query() query: LeadQueryDto) {
    return this.territoriesService.getLeads(query)
  }

  @Get(':id/hierarchy')
  getTerritoryHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.getTerritoryHierarchy(id)
  }

  @Post()
  createTerritory(@Body() dto: CreateTerritoryDto) {
    return this.territoriesService.createTerritory(dto)
  }

  @Patch(':id')
  updateTerritory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerritoryDto,
  ) {
    return this.territoriesService.updateTerritory(id, dto)
  }

  @Delete(':id')
  deleteTerritory(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.deleteTerritory(id)
  }

  // --- SUBTERRITÓRIOS ---
  @Post('subterritories')
  createSubterritory(@Body() dto: CreateSubterritoryDto) {
    return this.territoriesService.createSubterritory(dto)
  }

  @Patch('subterritories/:id')
  updateSubterritory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubterritoryDto,
  ) {
    return this.territoriesService.updateSubterritory(id, dto)
  }

  @Delete('subterritories/:id')
  deleteSubterritory(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.deleteSubterritory(id)
  }

  // --- BAIRROS ---
  @Post('neighborhoods')
  createNeighborhood(@Body() dto: CreateNeighborhoodDto) {
    return this.territoriesService.createNeighborhood(dto)
  }

  @Patch('neighborhoods/:id')
  updateNeighborhood(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNeighborhoodDto,
  ) {
    return this.territoriesService.updateNeighborhood(id, dto)
  }

  @Delete('neighborhoods/:id')
  deleteNeighborhood(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.deleteNeighborhood(id)
  }

  // --- RUAS ---
  @Post('streets')
  createStreet(@Body() dto: CreateStreetDto) {
    return this.territoriesService.createStreet(dto)
  }

  @Patch('streets/:id')
  updateStreet(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStreetDto,
  ) {
    return this.territoriesService.updateStreet(id, dto)
  }

  @Delete('streets/:id')
  deleteStreet(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.deleteStreet(id)
  }

  // --- RESIDÊNCIAS ---
  @Post('residences')
  createResidenceNumber(@Body() dto: CreateResidenceNumberDto) {
    return this.territoriesService.createResidenceNumber(dto)
  }

  @Post('residences/batch')
  batchCreateResidenceNumbers(@Body() dto: BatchCreateResidenceNumbersDto) {
    return this.territoriesService.batchCreateResidenceNumbers(dto)
  }

  @Patch('residences/:id')
  updateResidenceNumber(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidenceNumberDto,
  ) {
    return this.territoriesService.updateResidenceNumber(id, dto)
  }

  @Delete('residences/:id')
  deleteResidenceNumber(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.deleteResidenceNumber(id)
  }

  // --- LEADS ---
  @Post('leads')
  createLead(
    @Body() dto: CreateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.territoriesService.createLead(dto, req.user?.sub)
  }

  @Patch('leads/:id')
  updateLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.territoriesService.updateLead(id, dto)
  }

  @Delete('leads/:id')
  deleteLead(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.deleteLead(id)
  }
}
