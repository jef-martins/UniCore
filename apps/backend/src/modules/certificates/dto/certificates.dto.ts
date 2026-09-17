export interface CertificatesFilterDto {
  ano?: string
  curso?: string
  evento?: string
  busca?: string
}

export interface CertificateYearDto {
  year: number
}

export interface CertificateCourseDto {
  id: string
  name: string
}

export interface CertificateEventDto {
  id: string
  title: string
  workload: number | null
  classId: string | null
}

export interface CertificateInscriptionItemDto {
  id: string
  studentRa: string
  studentName: string
  eventId: string
  eventTitle: string
  workloadHours: number | null
  startDate: string | null
  endDate: string | null
  isPaid: boolean
  paymentDate: string | null
  attendanceCount: number
  hasAttendance: boolean
  isEligible: boolean
  blockedReason?: string
  emittedCount?: number
  lastEmittedAt?: string | null
}

export interface CertificateDocumentDto {
  inscricaoId: string
  studentRa: string
  studentName: string
  studentCpf: string | null
  eventId: string
  eventTitle: string
  workloadHours: number
  startDate: string | null
  endDate: string | null
  courseName: string | null
  issuedAt: string
  verificationCode: string
  institutionName: string
  issuedByName?: string
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: any
}

export interface CreateCustomEventDto {
  title: string
  description?: string
  workloadHours: number
  speaker?: string
  courseName?: string
  startDate: string
  endDate?: string
  location?: string
  logoUrl?: string
  certificateTemplateUrl?: string
  templateStyle?: any
}

export interface UpdateCustomEventDto {
  title?: string
  description?: string
  workloadHours?: number
  speaker?: string
  courseName?: string
  startDate?: string
  endDate?: string
  location?: string
  isActive?: boolean
  logoUrl?: string
  certificateTemplateUrl?: string
  templateStyle?: any
}

export interface CreateCustomParticipantDto {
  studentName: string
  studentRa: string
  studentCpf?: string
  studentEmail?: string
  isPaid?: boolean
  hasAttendance?: boolean
  notes?: string
}

export interface UpdateParticipantStatusDto {
  studentName?: string
  isPaid?: boolean
  hasAttendance?: boolean
  notes?: string
}

export interface CustomEventSummaryDto {
  id: string
  title: string
  description: string | null
  workloadHours: number
  speaker: string | null
  courseName: string | null
  startDate: string
  endDate: string | null
  location: string | null
  isActive: boolean
  logoUrl: string | null
  certificateTemplateUrl: string | null
  templateStyle?: any
  totalParticipants: number
  paidParticipants: number
  eligibleParticipants: number
  createdAt: string
}

export interface EventCatalogItemDto {
  id: string
  title: string
  description: string | null
  workloadHours: number
  speaker: string | null
  courseName: string | null
  startDate: string
  endDate: string | null
  location: string | null
  isActive: boolean
  logoUrl: string | null
  certificateTemplateUrl: string | null
  templateStyle?: any
  isRegistered?: boolean
  participantId?: string | null
  isPaid?: boolean
  hasAttendance?: boolean
  isEligible?: boolean
  issuedAt?: string | null
}

export interface CustomParticipantItemDto {
  id: string
  eventId: string
  eventTitle: string
  workloadHours: number
  studentName: string
  studentRa: string
  studentCpf: string | null
  studentEmail: string | null
  isPaid: boolean
  paymentDate: string | null
  hasAttendance: boolean
  attendanceCount: number
  isEligible: boolean
  blockedReason?: string
  notes: string | null
  createdAt: string
  emittedCount?: number
  lastEmittedAt?: string | null
}
