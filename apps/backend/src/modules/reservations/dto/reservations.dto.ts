import {
  ItemCondition,
  ItemOperationalStatus,
  ItemStatus,
  MaintenanceStatus,
  MaintenanceType,
  ReservationStatus,
} from '@prisma/client'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  category!: string

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  location!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  category?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  location?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition
}

export class UpdateItemStatusDto {
  @IsEnum(ItemStatus)
  status!: ItemStatus
}

export class CreateReservationDto {
  @IsUUID()
  itemId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  requesterName!: string

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  department!: string

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  purpose!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

export class UpdateReservationStatusDto {
  @IsEnum(ReservationStatus)
  status!: ReservationStatus
}

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType)
  type!: MaintenanceType

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  technician?: string

  @IsDateString()
  scheduledDate!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsBoolean()
  markItemInMaintenance?: boolean
}

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus

  @IsOptional()
  @IsDateString()
  completedDate?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  @IsOptional()
  @IsBoolean()
  restoreItemToAvailable?: boolean
}

export class CreateItemEvaluationDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number

  @IsEnum(ItemOperationalStatus)
  operationalStatus!: ItemOperationalStatus

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  studentName?: string
}

