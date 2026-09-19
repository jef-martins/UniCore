import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { LeadStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
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

@Injectable()
export class TerritoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // TERRITÓRIOS
  // ==========================================

  async getTerritories() {
    const territories = await this.prisma.territory.findMany({
      orderBy: { name: 'asc' },
      include: {
        subterritories: {
          include: {
            neighborhoods: {
              include: {
                streets: {
                  include: {
                    residences: {
                      include: {
                        leads: { select: { id: true, status: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    return territories.map((territory) => {
      let totalStreets = 0
      let completedStreets = 0
      let totalResidences = 0
      let visitedResidences = 0
      let totalLeads = 0
      const statusCounts: Record<string, number> = {
        FALHOU: 0,
        LEAD: 0,
        INSCRICAO: 0,
        MATRICULA: 0,
      }

      let totalSubterritories = territory.subterritories.length
      let completedSubterritories = 0
      let totalNeighborhoods = 0
      let completedNeighborhoods = 0

      territory.subterritories.forEach((st) => {
        let stStreets = 0
        let stCompletedStreets = 0
        let stNeighborhoods = st.neighborhoods.length
        let stCompletedNeighborhoods = 0

        totalNeighborhoods += stNeighborhoods

        st.neighborhoods.forEach((n) => {
          let nStreets = n.streets.length
          let nCompletedStreets = 0

          totalStreets += nStreets
          stStreets += nStreets

          n.streets.forEach((s) => {
            const resCount = s.residences.length
            totalResidences += resCount

            let streetVisited = 0
            s.residences.forEach((r) => {
              if (r.leads.length > 0) {
                visitedResidences += 1
                streetVisited += 1
                r.leads.forEach((l) => {
                  totalLeads += 1
                  if (statusCounts[l.status] !== undefined) {
                    statusCounts[l.status] += 1
                  }
                })
              }
            })

            // Regra: Uma rua está concluída se tem residências cadastradas e todas possuem lead preenchido
            const isStreetCompleted = resCount > 0 && streetVisited === resCount
            if (isStreetCompleted) {
              completedStreets += 1
              stCompletedStreets += 1
              nCompletedStreets += 1
            }
          })

          if (nStreets > 0 && nCompletedStreets === nStreets) {
            completedNeighborhoods += 1
            stCompletedNeighborhoods += 1
          }
        })

        if (stNeighborhoods > 0 && stCompletedNeighborhoods === stNeighborhoods) {
          completedSubterritories += 1
        }
      })

      const isCompleted =
        totalSubterritories > 0 && completedSubterritories === totalSubterritories
      const progressPercentage =
        totalResidences > 0
          ? Math.round((visitedResidences / totalResidences) * 100)
          : 0

      return {
        id: territory.id,
        name: territory.name,
        code: territory.code,
        description: territory.description,
        isActive: territory.isActive,
        createdAt: territory.createdAt,
        updatedAt: territory.updatedAt,
        stats: {
          totalSubterritories,
          completedSubterritories,
          totalNeighborhoods,
          completedNeighborhoods,
          totalStreets,
          completedStreets,
          totalResidences,
          visitedResidences,
          totalLeads,
          progressPercentage,
          isCompleted,
          statusCounts,
        },
      }
    })
  }

  async getTerritoryHierarchy(territoryId: string) {
    const territory = await this.prisma.territory.findUnique({
      where: { id: territoryId },
      include: {
        subterritories: {
          orderBy: { name: 'asc' },
          include: {
            neighborhoods: {
              orderBy: { name: 'asc' },
              include: {
                streets: {
                  orderBy: { name: 'asc' },
                  include: {
                    residences: {
                      orderBy: { number: 'asc' },
                      include: {
                        leads: {
                          orderBy: { date: 'desc' },
                          include: {
                            createdBy: {
                              select: { id: true, username: true, email: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!territory) {
      throw new NotFoundException('Território não encontrado')
    }

    // Calcula conclusões e estatísticas nó por nó (árvore completa)
    let territoryStreets = 0
    let territoryCompletedStreets = 0
    let territoryResidences = 0
    let territoryVisitedResidences = 0
    let territoryCompletedSub = 0

    const subterritories = territory.subterritories.map((sub) => {
      let subStreets = 0
      let subCompletedStreets = 0
      let subResidences = 0
      let subVisitedResidences = 0
      let subCompletedNeighborhoods = 0

      const neighborhoods = sub.neighborhoods.map((n) => {
        let nCompletedStreets = 0
        let nResidences = 0
        let nVisitedResidences = 0

        const streets = n.streets.map((s) => {
          const totalRes = s.residences.length
          const visitedRes = s.residences.filter((r) => r.leads.length > 0).length
          const isStreetCompleted = totalRes > 0 && visitedRes === totalRes
          const streetProgress =
            totalRes > 0 ? Math.round((visitedRes / totalRes) * 100) : 0

          if (isStreetCompleted) {
            nCompletedStreets += 1
            subCompletedStreets += 1
            territoryCompletedStreets += 1
          }

          nResidences += totalRes
          nVisitedResidences += visitedRes
          subResidences += totalRes
          subVisitedResidences += visitedRes
          territoryResidences += totalRes
          territoryVisitedResidences += visitedRes

          return {
            ...s,
            stats: {
              totalResidences: totalRes,
              visitedResidences: visitedRes,
              progressPercentage: streetProgress,
              isCompleted: isStreetCompleted,
            },
          }
        })

        territoryStreets += streets.length
        subStreets += streets.length

        const isNeighborhoodCompleted =
          streets.length > 0 && nCompletedStreets === streets.length
        if (isNeighborhoodCompleted) {
          subCompletedNeighborhoods += 1
        }

        const neighborhoodProgress =
          nResidences > 0 ? Math.round((nVisitedResidences / nResidences) * 100) : 0

        return {
          ...n,
          streets,
          stats: {
            totalStreets: streets.length,
            completedStreets: nCompletedStreets,
            totalResidences: nResidences,
            visitedResidences: nVisitedResidences,
            progressPercentage: neighborhoodProgress,
            isCompleted: isNeighborhoodCompleted,
          },
        }
      })

      const isSubCompleted =
        neighborhoods.length > 0 &&
        subCompletedNeighborhoods === neighborhoods.length
      if (isSubCompleted) {
        territoryCompletedSub += 1
      }

      const subProgress =
        subResidences > 0
          ? Math.round((subVisitedResidences / subResidences) * 100)
          : 0

      return {
        ...sub,
        neighborhoods,
        stats: {
          totalNeighborhoods: neighborhoods.length,
          completedNeighborhoods: subCompletedNeighborhoods,
          totalStreets: subStreets,
          completedStreets: subCompletedStreets,
          totalResidences: subResidences,
          visitedResidences: subVisitedResidences,
          progressPercentage: subProgress,
          isCompleted: isSubCompleted,
        },
      }
    })

    const isTerritoryCompleted =
      subterritories.length > 0 &&
      territoryCompletedSub === subterritories.length
    const territoryProgress =
      territoryResidences > 0
        ? Math.round((territoryVisitedResidences / territoryResidences) * 100)
        : 0

    return {
      id: territory.id,
      name: territory.name,
      code: territory.code,
      description: territory.description,
      isActive: territory.isActive,
      createdAt: territory.createdAt,
      updatedAt: territory.updatedAt,
      subterritories,
      stats: {
        totalSubterritories: subterritories.length,
        completedSubterritories: territoryCompletedSub,
        totalStreets: territoryStreets,
        completedStreets: territoryCompletedStreets,
        totalResidences: territoryResidences,
        visitedResidences: territoryVisitedResidences,
        progressPercentage: territoryProgress,
        isCompleted: isTerritoryCompleted,
      },
    }
  }

  async createTerritory(dto: CreateTerritoryDto) {
    if (dto.code) {
      const existing = await this.prisma.territory.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      })
      if (existing) {
        throw new BadRequestException('Já existe um território com este código.')
      }
    }

    return this.prisma.territory.create({
      data: {
        name: dto.name.trim(),
        code: dto.code ? dto.code.trim().toUpperCase() : null,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateTerritory(id: string, dto: UpdateTerritoryDto) {
    await this.ensureTerritoryExists(id)

    if (dto.code) {
      const existing = await this.prisma.territory.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      })
      if (existing && existing.id !== id) {
        throw new BadRequestException('Já existe outro território com este código.')
      }
    }

    return this.prisma.territory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && {
          code: dto.code ? dto.code.trim().toUpperCase() : null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteTerritory(id: string) {
    await this.ensureTerritoryExists(id)
    return this.prisma.territory.delete({ where: { id } })
  }

  // ==========================================
  // SUBTERRITÓRIOS
  // ==========================================

  async createSubterritory(dto: CreateSubterritoryDto) {
    await this.ensureTerritoryExists(dto.territoryId)
    return this.prisma.subterritory.create({
      data: {
        territoryId: dto.territoryId,
        name: dto.name.trim(),
        code: dto.code?.trim().toUpperCase() || null,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateSubterritory(id: string, dto: UpdateSubterritoryDto) {
    return this.prisma.subterritory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && {
          code: dto.code?.trim().toUpperCase() || null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteSubterritory(id: string) {
    return this.prisma.subterritory.delete({ where: { id } })
  }

  // ==========================================
  // BAIRROS
  // ==========================================

  async createNeighborhood(dto: CreateNeighborhoodDto) {
    return this.prisma.neighborhood.create({
      data: {
        subterritoryId: dto.subterritoryId,
        name: dto.name.trim(),
        city: dto.city?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateNeighborhood(id: string, dto: UpdateNeighborhoodDto) {
    return this.prisma.neighborhood.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteNeighborhood(id: string) {
    return this.prisma.neighborhood.delete({ where: { id } })
  }

  // ==========================================
  // RUAS
  // ==========================================

  async createStreet(dto: CreateStreetDto) {
    return this.prisma.street.create({
      data: {
        neighborhoodId: dto.neighborhoodId,
        name: dto.name.trim(),
        zipCode: dto.zipCode?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateStreet(id: string, dto: UpdateStreetDto) {
    return this.prisma.street.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.zipCode !== undefined && { zipCode: dto.zipCode?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteStreet(id: string) {
    return this.prisma.street.delete({ where: { id } })
  }

  // ==========================================
  // NÚMEROS DE RESIDÊNCIA
  // ==========================================

  async createResidenceNumber(dto: CreateResidenceNumberDto) {
    return this.prisma.residenceNumber.create({
      data: {
        streetId: dto.streetId,
        number: dto.number.trim(),
        complement: dto.complement?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    })
  }

  async batchCreateResidenceNumbers(dto: BatchCreateResidenceNumbersDto) {
    const street = await this.prisma.street.findUnique({
      where: { id: dto.streetId },
      include: { residences: { select: { number: true } } },
    })
    if (!street) throw new NotFoundException('Rua não encontrada')

    const existingNumbers = new Set(
      street.residences.map((r) => r.number.trim().toLowerCase()),
    )
    const numbersToInsert: string[] = []

    if (dto.customNumbers && dto.customNumbers.length > 0) {
      dto.customNumbers.forEach((raw) => {
        const trimmed = raw.trim()
        if (trimmed && !existingNumbers.has(trimmed.toLowerCase())) {
          existingNumbers.add(trimmed.toLowerCase())
          numbersToInsert.push(trimmed)
        }
      })
    } else if (dto.fromNumber !== undefined && dto.toNumber !== undefined) {
      const step = dto.step && dto.step > 0 ? dto.step : 1
      const start = Math.min(dto.fromNumber, dto.toNumber)
      const end = Math.max(dto.fromNumber, dto.toNumber)
      const parity = dto.parity || 'ALL'

      let initial = start
      if (parity === 'EVEN' && initial % 2 !== 0) {
        initial += 1
      } else if (parity === 'ODD' && initial % 2 === 0) {
        initial += 1
      }

      for (let i = initial; i <= end; i += step) {
        if (parity === 'EVEN' && i % 2 !== 0) continue
        if (parity === 'ODD' && i % 2 === 0) continue

        const numStr = String(i)
        if (!existingNumbers.has(numStr.toLowerCase())) {
          existingNumbers.add(numStr.toLowerCase())
          numbersToInsert.push(numStr)
        }
      }
    }

    if (numbersToInsert.length === 0) {
      return { count: 0, message: 'Nenhum novo número para adicionar (possíveis duplicados).' }
    }

    await this.prisma.residenceNumber.createMany({
      data: numbersToInsert.map((num) => ({
        streetId: dto.streetId,
        number: num,
      })),
    })

    return {
      count: numbersToInsert.length,
      message: `${numbersToInsert.length} números de residência adicionados com sucesso.`,
    }
  }

  async updateResidenceNumber(id: string, dto: UpdateResidenceNumberDto) {
    return this.prisma.residenceNumber.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: dto.number.trim() }),
        ...(dto.complement !== undefined && {
          complement: dto.complement?.trim() || null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      },
    })
  }

  async deleteResidenceNumber(id: string) {
    return this.prisma.residenceNumber.delete({ where: { id } })
  }

  // ==========================================
  // LEADS
  // ==========================================

  async getLeads(query: LeadQueryDto) {
    const where: Prisma.LeadWhereInput = {}

    if (query.status) {
      where.status = query.status
    }
    if (query.origin) {
      where.origin = query.origin
    }
    if (query.startDate || query.endDate) {
      where.date = {}
      if (query.startDate) {
        where.date.gte = new Date(query.startDate)
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate)
      }
    }
    if (query.search) {
      const s = query.search.trim()
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { whatsapp: { contains: s } },
        { courseOrArea: { contains: s, mode: 'insensitive' } },
      ]
    }

    if (
      query.streetId ||
      query.neighborhoodId ||
      query.subterritoryId ||
      query.territoryId
    ) {
      where.residenceNumber = {}
      if (query.streetId) {
        where.residenceNumber.streetId = query.streetId
      } else if (query.neighborhoodId) {
        where.residenceNumber.street = { neighborhoodId: query.neighborhoodId }
      } else if (query.subterritoryId) {
        where.residenceNumber.street = {
          neighborhood: { subterritoryId: query.subterritoryId },
        }
      } else if (query.territoryId) {
        where.residenceNumber.street = {
          neighborhood: { subterritory: { territoryId: query.territoryId } },
        }
      }
    }

    return this.prisma.lead.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
        residenceNumber: {
          include: {
            street: {
              include: {
                neighborhood: {
                  include: {
                    subterritory: {
                      include: {
                        territory: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async createLead(dto: CreateLeadDto, userId?: string) {
    const residence = await this.prisma.residenceNumber.findUnique({
      where: { id: dto.residenceNumberId },
    })
    if (!residence) {
      throw new NotFoundException('Número de residência não encontrado')
    }

    return this.prisma.lead.create({
      data: {
        residenceNumberId: dto.residenceNumberId,
        name: dto.name.trim(),
        whatsapp: dto.whatsapp.trim(),
        courseOrArea: dto.courseOrArea.trim(),
        date: new Date(dto.date),
        origin: dto.origin?.trim() || 'VISITA_DOMICILIAR',
        authorizedInfo: dto.authorizedInfo ?? false,
        effectiveContact:
          dto.effectiveContact !== undefined
            ? dto.effectiveContact
            : dto.status !== LeadStatus.FALHOU,
        status: dto.status ?? LeadStatus.LEAD,
        observations: dto.observations?.trim() || null,
        createdById: userId || null,
      },
      include: {
        createdBy: { select: { id: true, username: true, email: true } },
        residenceNumber: {
          include: {
            street: {
              include: {
                neighborhood: {
                  include: {
                    subterritory: {
                      include: {
                        territory: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('Lead não encontrado')

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp.trim() }),
        ...(dto.courseOrArea !== undefined && {
          courseOrArea: dto.courseOrArea.trim(),
        }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.origin !== undefined && {
          origin: dto.origin?.trim() || 'VISITA_DOMICILIAR',
        }),
        ...(dto.authorizedInfo !== undefined && {
          authorizedInfo: dto.authorizedInfo,
        }),
        ...(dto.effectiveContact !== undefined && {
          effectiveContact: dto.effectiveContact,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.observations !== undefined && {
          observations: dto.observations?.trim() || null,
        }),
      },
      include: {
        createdBy: { select: { id: true, username: true, email: true } },
        residenceNumber: {
          include: {
            street: {
              include: {
                neighborhood: {
                  include: {
                    subterritory: {
                      include: {
                        territory: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async deleteLead(id: string) {
    return this.prisma.lead.delete({ where: { id } })
  }

  // ==========================================
  // DASHBOARD DE QUANTIFICAÇÕES E ANÁLISE
  // ==========================================

  async getDashboardStats(query: LeadQueryDto) {
    const territories = await this.getTerritories()

    // Resumo de contadores territoriais
    let totalTerritories = territories.length
    let completedTerritories = 0
    let totalSubterritories = 0
    let completedSubterritories = 0
    let totalNeighborhoods = 0
    let completedNeighborhoods = 0
    let totalStreets = 0
    let completedStreets = 0
    let totalResidences = 0
    let visitedResidences = 0
    let totalLeadsCount = 0

    territories.forEach((t) => {
      if (t.stats.isCompleted) completedTerritories += 1
      totalSubterritories += t.stats.totalSubterritories
      completedSubterritories += t.stats.completedSubterritories
      totalNeighborhoods += t.stats.totalNeighborhoods
      completedNeighborhoods += t.stats.completedNeighborhoods
      totalStreets += t.stats.totalStreets
      completedStreets += t.stats.completedStreets
      totalResidences += t.stats.totalResidences
      visitedResidences += t.stats.visitedResidences
      totalLeadsCount += t.stats.totalLeads
    })

    // Leads com os filtros aplicados
    const leads = await this.getLeads(query)

    // Agrupamento por status
    const statusCounts = {
      FALHOU: 0,
      LEAD: 0,
      INSCRICAO: 0,
      MATRICULA: 0,
    }

    // Agrupamento por origem
    const originCounts: Record<string, number> = {}

    // Agrupamento por cursos / áreas de interesse
    const courseCounts: Record<string, number> = {}

    // Agrupamento por data (últimos 14 dias ou geral)
    const dailyCounts: Record<string, { total: number; matricula: number; inscricao: number }> = {}

    let authorizedCount = 0
    let effectiveContactsCount = 0

    leads.forEach((l) => {
      if (statusCounts[l.status] !== undefined) {
        statusCounts[l.status] += 1
      }
      if (l.authorizedInfo) {
        authorizedCount += 1
      }
      if (l.effectiveContact || l.status !== LeadStatus.FALHOU) {
        effectiveContactsCount += 1
      }

      // Origem
      const orig = l.origin || 'VISITA_DOMICILIAR'
      originCounts[orig] = (originCounts[orig] || 0) + 1

      // Curso
      const course = l.courseOrArea.trim()
      courseCounts[course] = (courseCounts[course] || 0) + 1

      // Data
      const dayStr = l.date.toISOString().split('T')[0]
      if (!dailyCounts[dayStr]) {
        dailyCounts[dayStr] = { total: 0, matricula: 0, inscricao: 0 }
      }
      dailyCounts[dayStr].total += 1
      if (l.status === LeadStatus.MATRICULA) dailyCounts[dayStr].matricula += 1
      if (l.status === LeadStatus.INSCRICAO) dailyCounts[dayStr].inscricao += 1
    })

    const totalFilteredLeads = leads.length
    const qualifiedLeadsCount =
      statusCounts.LEAD + statusCounts.INSCRICAO + statusCounts.MATRICULA
    const inscricoesCount = statusCounts.INSCRICAO + statusCounts.MATRICULA
    const matriculasCount = statusCounts.MATRICULA

    // Taxas de conversão exatas do painel executivo
    const conversions = {
      contatoPorCasa:
        totalResidences > 0
          ? Number(((effectiveContactsCount / totalResidences) * 100).toFixed(1))
          : 0,
      leadPorContato:
        effectiveContactsCount > 0
          ? Number(((qualifiedLeadsCount / effectiveContactsCount) * 100).toFixed(1))
          : 0,
      leadPorCasa:
        totalResidences > 0
          ? Number(((qualifiedLeadsCount / totalResidences) * 100).toFixed(1))
          : 0,
      inscricaoPorLead:
        qualifiedLeadsCount > 0
          ? Number(((inscricoesCount / qualifiedLeadsCount) * 100).toFixed(1))
          : 0,
      matriculaPorLead:
        qualifiedLeadsCount > 0
          ? Number(((matriculasCount / qualifiedLeadsCount) * 100).toFixed(1))
          : 0,
    }

    // Metas do Piloto — 10 Dias
    const pilotGoals = [
      {
        indicator: 'Residências',
        meta: 1000,
        realizado: totalResidences,
        pctMeta: Number(((totalResidences / 1000) * 100).toFixed(1)),
      },
      {
        indicator: 'Contatos efetivos',
        meta: 600,
        realizado: effectiveContactsCount,
        pctMeta: Number(((effectiveContactsCount / 600) * 100).toFixed(1)),
      },
      {
        indicator: 'Leads mínimos',
        meta: 200,
        realizado: qualifiedLeadsCount,
        pctMeta: Number(((qualifiedLeadsCount / 200) * 100).toFixed(1)),
      },
      {
        indicator: 'Leads desejáveis',
        meta: 300,
        realizado: qualifiedLeadsCount,
        pctMeta: Number(((qualifiedLeadsCount / 300) * 100).toFixed(1)),
      },
    ]

    // Semáforo dos Setores (Subterritórios)
    const subterritories = await this.prisma.subterritory.findMany({
      include: {
        territory: { select: { id: true, name: true } },
        neighborhoods: {
          include: {
            streets: {
              include: {
                residences: {
                  include: {
                    leads: {
                      select: {
                        id: true,
                        status: true,
                        effectiveContact: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    let verdeCount = 0
    let amareloCount = 0
    let vermelhoCount = 0

    const sectorTrafficLight = subterritories.map((sub) => {
      let subRes = 0
      let subVisited = 0
      let subLeads = 0
      let subContatos = 0
      let subInsc = 0
      let subMatr = 0

      sub.neighborhoods.forEach((n) => {
        n.streets.forEach((s) => {
          subRes += s.residences.length
          s.residences.forEach((r) => {
            if (r.leads.length > 0) {
              subVisited += 1
              r.leads.forEach((l) => {
                if (l.effectiveContact || l.status !== LeadStatus.FALHOU) {
                  subContatos += 1
                }
                if (
                  l.status === LeadStatus.LEAD ||
                  l.status === LeadStatus.INSCRICAO ||
                  l.status === LeadStatus.MATRICULA
                ) {
                  subLeads += 1
                }
                if (
                  l.status === LeadStatus.INSCRICAO ||
                  l.status === LeadStatus.MATRICULA
                ) {
                  subInsc += 1
                }
                if (l.status === LeadStatus.MATRICULA) {
                  subMatr += 1
                }
              })
            }
          })
        })
      })

      const leadsPer100Houses =
        subRes > 0 ? Number(((subLeads / subRes) * 100).toFixed(1)) : 0

      let classification: 'VERDE' | 'AMARELO' | 'VERMELHO' = 'VERMELHO'
      if (leadsPer100Houses >= 20) {
        classification = 'VERDE'
        verdeCount += 1
      } else if (leadsPer100Houses >= 10) {
        classification = 'AMARELO'
        amareloCount += 1
      } else {
        classification = 'VERMELHO'
        vermelhoCount += 1
      }

      return {
        subterritoryId: sub.id,
        subterritoryName: sub.name,
        territoryName: sub.territory.name,
        totalResidences: subRes,
        visitedResidences: subVisited,
        leadsCount: subLeads,
        contatosCount: subContatos,
        inscricoesCount: subInsc,
        matriculasCount: subMatr,
        leadsPer100Houses,
        classification,
      }
    })

    const conversionRateToInscricao =
      totalFilteredLeads > 0
        ? Math.round((inscricoesCount / totalFilteredLeads) * 100)
        : 0
    const conversionRateToMatricula =
      totalFilteredLeads > 0
        ? Math.round((matriculasCount / totalFilteredLeads) * 100)
        : 0
    const coveragePercentage =
      totalResidences > 0
        ? Math.round((visitedResidences / totalResidences) * 100)
        : 0
    const streetsCompletionRate =
      totalStreets > 0 ? Math.round((completedStreets / totalStreets) * 100) : 0

    // Funil de conversão
    const funnel = [
      {
        stage: 'Residências Cobertas',
        count: visitedResidences,
        percentage: 100,
        hint: `${visitedResidences} de ${totalResidences} residências visitadas`,
      },
      {
        stage: 'Leads Coletados',
        count: totalFilteredLeads,
        percentage:
          visitedResidences > 0
            ? Math.round((totalFilteredLeads / visitedResidences) * 100)
            : 0,
        hint: 'Abordagens com contato e interesse',
      },
      {
        stage: 'Inscrições Realizadas',
        count: statusCounts.INSCRICAO + statusCounts.MATRICULA,
        percentage:
          totalFilteredLeads > 0
            ? Math.round(
                ((statusCounts.INSCRICAO + statusCounts.MATRICULA) /
                  totalFilteredLeads) *
                  100,
              )
            : 0,
        hint: 'Leads convertidos em inscrição no processo',
      },
      {
        stage: 'Matrículas Efetivadas',
        count: statusCounts.MATRICULA,
        percentage:
          totalFilteredLeads > 0
            ? Math.round((statusCounts.MATRICULA / totalFilteredLeads) * 100)
            : 0,
        hint: 'Alunos formalmente matriculados',
      },
    ]

    // Ranking de territórios
    const territoryRanking = territories
      .map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        progressPercentage: t.stats.progressPercentage,
        isCompleted: t.stats.isCompleted,
        totalResidences: t.stats.totalResidences,
        visitedResidences: t.stats.visitedResidences,
        totalStreets: t.stats.totalStreets,
        completedStreets: t.stats.completedStreets,
        totalLeads: t.stats.totalLeads,
        statusCounts: t.stats.statusCounts,
      }))
      .sort((a, b) => b.progressPercentage - a.progressPercentage)

    // Top cursos ordenados
    const topCourses = Object.entries(courseCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalFilteredLeads > 0
            ? Math.round((count / totalFilteredLeads) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Origens ordenadas
    const leadsByOrigin = Object.entries(originCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalFilteredLeads > 0
            ? Math.round((count / totalFilteredLeads) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Timeline ordenada
    const timeline = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        inscricao: counts.inscricao,
        matricula: counts.matricula,
      }))

    return {
      overview: {
        totalTerritories,
        completedTerritories,
        totalSubterritories,
        completedSubterritories,
        totalNeighborhoods,
        completedNeighborhoods,
        totalStreets,
        completedStreets,
        streetsCompletionRate,
        totalResidences,
        visitedResidences,
        coveragePercentage,
        totalLeads: totalFilteredLeads,
        authorizedCount,
        authorizationPercentage:
          totalFilteredLeads > 0
            ? Math.round((authorizedCount / totalFilteredLeads) * 100)
            : 0,
        conversionRateToInscricao,
        conversionRateToMatricula,
      },
      mainIndicators: {
        residencias: totalResidences,
        contatos: effectiveContactsCount,
        leads: qualifiedLeadsCount,
        inscricoes: inscricoesCount,
        matriculas: matriculasCount,
      },
      conversions,
      pilotGoals,
      trafficLight: {
        summary: {
          verde: verdeCount,
          amarelo: amareloCount,
          vermelho: vermelhoCount,
        },
        sectors: sectorTrafficLight,
        stages: {
          casas: totalResidences,
          contatos: effectiveContactsCount,
          leads: qualifiedLeadsCount,
          inscricoes: inscricoesCount,
          matriculas: matriculasCount,
        },
      },
      statusBreakdown: {
        counts: statusCounts,
        percentages: {
          FALHOU:
            totalFilteredLeads > 0
              ? Math.round((statusCounts.FALHOU / totalFilteredLeads) * 100)
              : 0,
          LEAD:
            totalFilteredLeads > 0
              ? Math.round((statusCounts.LEAD / totalFilteredLeads) * 100)
              : 0,
          INSCRICAO:
            totalFilteredLeads > 0
              ? Math.round((statusCounts.INSCRICAO / totalFilteredLeads) * 100)
              : 0,
          MATRICULA:
            totalFilteredLeads > 0
              ? Math.round((statusCounts.MATRICULA / totalFilteredLeads) * 100)
              : 0,
        },
      },
      funnel,
      territoryRanking,
      topCourses,
      leadsByOrigin,
      timeline,
      recentLeads: leads.slice(0, 10).map((l) => ({
        id: l.id,
        name: l.name,
        whatsapp: l.whatsapp,
        courseOrArea: l.courseOrArea,
        date: l.date,
        origin: l.origin,
        status: l.status,
        authorizedInfo: l.authorizedInfo,
        residenceNumber: l.residenceNumber.number,
        streetName: l.residenceNumber.street.name,
        neighborhoodName: l.residenceNumber.street.neighborhood.name,
        subterritoryName:
          l.residenceNumber.street.neighborhood.subterritory.name,
        territoryName:
          l.residenceNumber.street.neighborhood.subterritory.territory.name,
        createdByName: l.createdBy?.username || 'Sistema',
      })),
    }
  }

  private async ensureTerritoryExists(id: string) {
    const territory = await this.prisma.territory.findUnique({ where: { id } })
    if (!territory) {
      throw new NotFoundException('Território não encontrado')
    }
    return territory
  }
}
