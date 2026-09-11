import { ItemCondition, ItemStatus, ReservationStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

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
