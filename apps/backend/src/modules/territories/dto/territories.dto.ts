import { LeadStatus } from '@prisma/client'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

// --- TERRITÓRIOS ---
export class CreateTerritoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateTerritoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// --- SUBTERRITÓRIOS ---
export class CreateSubterritoryDto {
  @IsUUID()
  territoryId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateSubterritoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// --- BAIRROS ---
export class CreateNeighborhoodDto {
  @IsUUID()
  subterritoryId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateNeighborhoodDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// --- RUAS ---
export class CreateStreetDto {
  @IsUUID()
  neighborhoodId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateStreetDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// --- NÚMEROS DE RESIDÊNCIA ---
export class CreateResidenceNumberDto {
  @IsUUID()
  streetId!: string

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  number!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

export class UpdateResidenceNumberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  number?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

export class BatchCreateResidenceNumbersDto {
  @IsUUID()
  streetId!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  fromNumber?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  toNumber?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  step?: number // 1: all, 2: even/odd

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customNumbers?: string[]
}

// --- LEADS ---
export class CreateLeadDto {
  @IsUUID()
  residenceNumberId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  whatsapp!: string

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  courseOrArea!: string

  @IsDateString()
  date!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  origin?: string

  @IsOptional()
  @IsBoolean()
  authorizedInfo?: boolean

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  whatsapp?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  courseOrArea?: string

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  origin?: string

  @IsOptional()
  @IsBoolean()
  authorizedInfo?: boolean

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string
}

export class LeadQueryDto {
  @IsOptional()
  @IsUUID()
  territoryId?: string

  @IsOptional()
  @IsUUID()
  subterritoryId?: string

  @IsOptional()
  @IsUUID()
  neighborhoodId?: string

  @IsOptional()
  @IsUUID()
  streetId?: string

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus

  @IsOptional()
  @IsString()
  origin?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string
}
