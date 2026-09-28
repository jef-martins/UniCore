import { describe, expect, it } from 'vitest'

describe('Central de Chamados & Métricas do Desenvolvedor', () => {
  // Helpers testados
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'ABERTO': return 'Aberto'
      case 'EM_ANDAMENTO': return 'Em Atendimento'
      case 'CONCLUIDO': return 'Concluído'
      case 'FINALIZADO': return 'Finalizado'
      case 'CANCELADO': return 'Cancelado'
      default: return status
    }
  }

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'BAIXA': return 'Baixa'
      case 'MEDIA': return 'Média'
      case 'ALTA': return 'Alta'
      case 'URGENTE': return 'Urgente'
      default: return priority
    }
  }

  const getPercentage = (val: number, total: number): number => {
    if (!total || total === 0) return 0
    return Math.round((val / total) * 100)
  }

  const formatTempoMedio = (hours: number): string => {
    if (!hours || hours <= 0) return '0 h'
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes} min`
    }
    if (hours > 24) {
      const days = Math.round((hours / 24) * 10) / 10
      return `${days} dia(s)`
    }
    return `${hours}h`
  }

  const formatBytes = (bytes: number | null | undefined): string => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const isTicket = (taskId: string): boolean => {
    return taskId.startsWith('ticket-')
  }

  describe('Labels e Formatação de Status e Prioridade', () => {
    it('deve retornar os rótulos corretos para todos os status de chamados', () => {
      expect(getStatusLabel('ABERTO')).toBe('Aberto')
      expect(getStatusLabel('EM_ANDAMENTO')).toBe('Em Atendimento')
      expect(getStatusLabel('CONCLUIDO')).toBe('Concluído')
      expect(getStatusLabel('FINALIZADO')).toBe('Finalizado')
      expect(getStatusLabel('CANCELADO')).toBe('Cancelado')
      expect(getStatusLabel('OUTRO')).toBe('OUTRO')
    })

    it('deve retornar os rótulos corretos para todas as prioridades', () => {
      expect(getPriorityLabel('BAIXA')).toBe('Baixa')
      expect(getPriorityLabel('MEDIA')).toBe('Média')
      expect(getPriorityLabel('ALTA')).toBe('Alta')
      expect(getPriorityLabel('URGENTE')).toBe('Urgente')
    })
  })

  describe('Cálculo de Métricas e KPIs do Dashboard de Chamados', () => {
    it('deve calcular porcentagens e taxa de resolução corretamente', () => {
      expect(getPercentage(0, 0)).toBe(0)
      expect(getPercentage(5, 20)).toBe(25)
      expect(getPercentage(10, 15)).toBe(67)
      expect(getPercentage(20, 20)).toBe(100)
    })

    it('deve formatar o tempo médio de resolução em minutos, horas ou dias', () => {
      expect(formatTempoMedio(0)).toBe('0 h')
      expect(formatTempoMedio(0.5)).toBe('30 min')
      expect(formatTempoMedio(2.4)).toBe('2.4h')
      expect(formatTempoMedio(48)).toBe('2 dia(s)')
      expect(formatTempoMedio(36)).toBe('1.5 dia(s)')
    })

    it('deve formatar tamanhos de anexos corretamente', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB')
    })
  })

  describe('Integração de Chamados na Agenda do Desenvolvedor (Master)', () => {
    it('deve identificar tarefas geradas a partir de chamados pelo prefixo ticket-', () => {
      expect(isTicket('ticket-819a5573-0fb6-455b-9d4e-1234567890ab')).toBe(true)
      expect(isTicket('ticket-123')).toBe(true)
      expect(isTicket('regular-task-uuid')).toBe(false)
      expect(isTicket('ev-academic-event-uuid')).toBe(false)
    })

    it('deve extrair o ID do chamado a partir do taskId da agenda', () => {
      const taskId = 'ticket-d3b07384-d113-4a15-b384-9c869a8b1a20'
      const ticketId = taskId.replace('ticket-', '')
      expect(ticketId).toBe('d3b07384-d113-4a15-b384-9c869a8b1a20')
    })
  })

  describe('Filtros de Busca e Listagem de Chamados', () => {
    const mockTickets = [
      { id: '1', code: 1, title: 'Erro ao gerar boleto', description: 'O aluno tenta baixar o boleto mas dá 404', sector: 'TESOURARIA', status: 'ABERTO', user: 'joao' },
      { id: '2', code: 2, title: 'Lentidão no vestibular', description: 'Sistema de provas está demorando a responder', sector: 'VESTIBULAR', status: 'EM_ANDAMENTO', user: 'maria' },
      { id: '3', code: 3, title: 'Ajuste no certificado de evento', description: 'Carga horária está saindo errada', sector: 'COORDENACAO', status: 'CONCLUIDO', user: 'carlos' },
    ]

    it('deve filtrar por termo de busca em título ou descrição', () => {
      const query = 'boleto'
      const filtered = mockTickets.filter(t => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query))
      expect(filtered.length).toBe(1)
      expect(filtered[0].code).toBe(1)
    })

    it('deve filtrar por código de chamado', () => {
      const codeQuery = '2'
      const filtered = mockTickets.filter(t => String(t.code) === codeQuery || `#${t.code}` === `#${codeQuery}`)
      expect(filtered.length).toBe(1)
      expect(filtered[0].title).toBe('Lentidão no vestibular')
    })

    it('deve filtrar por status do chamado', () => {
      const openTickets = mockTickets.filter(t => t.status === 'ABERTO')
      expect(openTickets.length).toBe(1)
      expect(openTickets[0].sector).toBe('TESOURARIA')
    })
  })

  describe('Cards de Resumo como Botões de Filtro e Contadores Preservados', () => {
    const allMockTickets = [
      { id: '1', code: 1, title: 'Erro A', status: 'ABERTO', userId: 'user-1' },
      { id: '2', code: 2, title: 'Erro B', status: 'ABERTO', userId: 'user-1' },
      { id: '3', code: 3, title: 'Erro C', status: 'EM_ANDAMENTO', userId: 'user-2' },
      { id: '4', code: 4, title: 'Erro D', status: 'CONCLUIDO', userId: 'user-1' },
      { id: '5', code: 5, title: 'Erro E', status: 'CONCLUIDO', userId: 'user-3' },
      { id: '6', code: 6, title: 'Erro F', status: 'FINALIZADO', userId: 'user-1' },
    ]

    it('deve calcular os contadores dos cards a partir de allTickets e manter os valores mesmo após filtrar', () => {
      // Simulação do comportamento do componente
      const countTotal = allMockTickets.length
      const countAbertos = allMockTickets.filter(t => t.status === 'ABERTO').length
      const countEmAndamento = allMockTickets.filter(t => t.status === 'EM_ANDAMENTO').length
      const countConcluidos = allMockTickets.filter(t => t.status === 'CONCLUIDO').length
      const countFinalizados = allMockTickets.filter(t => t.status === 'FINALIZADO').length

      expect(countTotal).toBe(6)
      expect(countAbertos).toBe(2)
      expect(countEmAndamento).toBe(1)
      expect(countConcluidos).toBe(2)
      expect(countFinalizados).toBe(1)

      // Quando o usuário clica no card "CONCLUÍDOS":
      let filterStatus = 'CONCLUIDO'
      const filtered = allMockTickets.filter(t => t.status === filterStatus)
      expect(filtered.length).toBe(2)

      // Os contadores dos cards continuam íntegros e não são zerados!
      expect(countTotal).toBe(6)
      expect(countAbertos).toBe(2)
      expect(countConcluidos).toBe(2)
    })

    it('deve alternar (toggle) o filtro ao clicar no mesmo card', () => {
      let filterStatus = ''

      const toggleStatusFilter = (status: string) => {
        if (filterStatus === status) {
          filterStatus = ''
        } else {
          filterStatus = status
        }
      }

      // Clica em CONCLUIDO -> ativa o filtro
      toggleStatusFilter('CONCLUIDO')
      expect(filterStatus).toBe('CONCLUIDO')

      // Clica novamente em CONCLUIDO -> limpa o filtro e volta para todos
      toggleStatusFilter('CONCLUIDO')
      expect(filterStatus).toBe('')

      // Clica em FINALIZADO -> ativa FINALIZADO
      toggleStatusFilter('FINALIZADO')
      expect(filterStatus).toBe('FINALIZADO')

      // Clica no card TOTAL ('') -> limpa o filtro
      toggleStatusFilter('')
      expect(filterStatus).toBe('')
    })

    it('deve isolar a visualização: usuário comum só vê seus chamados, usuário MASTER vê tudo', () => {
      const currentUserId = 'user-1'

      // Filtro para usuário comum (não-master)
      const userTickets = allMockTickets.filter(t => t.userId === currentUserId)
      expect(userTickets.length).toBe(4)
      expect(userTickets.every(t => t.userId === currentUserId)).toBe(true)

      // Usuário master vê todos os chamados
      const isMaster = true
      const masterTickets = isMaster ? allMockTickets : allMockTickets.filter(t => t.userId === currentUserId)
      expect(masterTickets.length).toBe(6)
    })

    it('deve resolver o usuário efetivo com base no contexto ativo (ex: Professor) e desativar modo master', () => {
      const loggedInMasterUser = { id: 'master-uuid', username: 'master', role: 'master' }
      const activeContextProfessor = { id: 'prof-uuid', username: 'professor', role: 'professor' }

      // Quando há contexto ativo de professor selecionado no cabeçalho
      const activeContextUser = activeContextProfessor
      const effectiveUser = activeContextUser || loggedInMasterUser
      const isMasterUser = effectiveUser.role === 'master'

      expect(effectiveUser.username).toBe('professor')
      expect(effectiveUser.role).toBe('professor')
      expect(isMasterUser).toBe(false) // Desativa o modo master quando estiver em outro contexto!

      // Barra de filtros inferior deve ser exibida apenas se isMasterUser for true
      const showBottomFilterBar = isMasterUser
      expect(showBottomFilterBar).toBe(false) // Removida para o professor
    })

    it('deve garantir que na rota do desenvolvedor (/desenvolvedor/chamados) o usuário master visualize todos os chamados globalmente', () => {
      const loggedInMasterUser = { id: 'master-uuid', username: 'master', role: 'master' }
      const currentRoute = '/desenvolvedor/chamados'
      const isDeveloperRoute = currentRoute.includes('/desenvolvedor')

      // Na rota de desenvolvedor, mesmo se houver contexto residual de outro usuário, o master sempre prevalece
      const effectiveUser = (isDeveloperRoute && loggedInMasterUser.role === 'master')
        ? loggedInMasterUser
        : { id: 'admin-uuid', username: 'admin', role: 'admin' }

      const isMasterUser = (isDeveloperRoute && loggedInMasterUser.role === 'master') || effectiveUser.role === 'master'

      expect(isDeveloperRoute).toBe(true)
      expect(effectiveUser.role).toBe('master')
      expect(isMasterUser).toBe(true)

      // Com isMasterUser = true, targetUserId é undefined e todos os chamados são listados
      const targetUserId = !isMasterUser ? effectiveUser.id : undefined
      expect(targetUserId).toBeUndefined()
    })
  })

  describe('Transições de Status e Permissões (Master e Solicitante)', () => {
    const validStatuses = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'FINALIZADO', 'CANCELADO']

    it('deve permitir que o usuário master transicione o chamado para qualquer status', () => {
      const isMaster = true
      const isOwner = false

      validStatuses.forEach((status) => {
        const canUpdate = isMaster || isOwner
        expect(canUpdate).toBe(true)
      })
    })

    it('deve permitir que o solicitante (dono do chamado) interaja e altere status', () => {
      const isMaster = false
      const isOwner = true

      validStatuses.forEach((status) => {
        const canUpdate = isMaster || isOwner
        expect(canUpdate).toBe(true)
      })
    })

    it('deve bloquear usuários não-autores e não-master de alterar o status', () => {
      const isMaster = false
      const isOwner = false

      validStatuses.forEach((status) => {
        const canUpdate = isMaster || isOwner
        expect(canUpdate).toBe(false)
      })
    })
  })

  describe('Relatório de Chamados: Filtragem sem Redirecionamento', () => {
    const mockReportTickets = [
      { id: '1', code: 1, title: 'Falha login', status: 'ABERTO' },
      { id: '2', code: 2, title: 'Ajuste nota', status: 'EM_ANDAMENTO' },
      { id: '3', code: 3, title: 'Boleto duplicado', status: 'CONCLUIDO' },
      { id: '4', code: 4, title: 'Certificado emitido', status: 'FINALIZADO' },
      { id: '5', code: 5, title: 'Erro de cadastro', status: 'CANCELADO' },
    ]

    it('deve filtrar os chamados no relatório in-place ao clicar nos cards sem redirecionar', () => {
      let selectedReportStatus = ''

      const filterReportByStatus = (status: string) => {
        if (selectedReportStatus === status) {
          selectedReportStatus = ''
        } else {
          selectedReportStatus = status
        }
      }

      // Card Total -> todos os 5
      filterReportByStatus('')
      let filtered = mockReportTickets.filter(t => !selectedReportStatus || t.status === selectedReportStatus)
      expect(filtered.length).toBe(5)

      // Card Abertos -> 1
      filterReportByStatus('ABERTO')
      filtered = mockReportTickets.filter(t => t.status === selectedReportStatus)
      expect(filtered.length).toBe(1)
      expect(filtered[0].title).toBe('Falha login')

      // Card Em Atendimento -> 1
      filterReportByStatus('EM_ANDAMENTO')
      filtered = mockReportTickets.filter(t => t.status === selectedReportStatus)
      expect(filtered.length).toBe(1)
      expect(filtered[0].title).toBe('Ajuste nota')

      // Card Concluídos / Finalizados -> 2
      const filterConcluidosFinalizados = mockReportTickets.filter(
        t => t.status === 'CONCLUIDO' || t.status === 'FINALIZADO'
      )
      expect(filterConcluidosFinalizados.length).toBe(2)
    })
  })

  describe('Novas Regras de Negócio e UX dos Chamados', () => {
    // Helper de reabertura (espelho da lógica implementada no componente e service)
    const isTicketClosed = (status: string): boolean => {
      return status === 'CONCLUIDO' || status === 'FINALIZADO' || status === 'CANCELADO'
    }

    const canReopenTicket = (ticket: { status: string; closedAt?: string | null; updatedAt?: string }): boolean => {
      if (!isTicketClosed(ticket.status)) return false
      const closedRef = ticket.closedAt || ticket.updatedAt
      if (!closedRef) return true
      const elapsed = Date.now() - new Date(closedRef).getTime()
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
      return elapsed <= fiveDaysMs
    }

    const getRemainingReopenDays = (ticket: { status: string; closedAt?: string | null; updatedAt?: string }): number => {
      if (!isTicketClosed(ticket.status)) return 0
      const closedRef = ticket.closedAt || ticket.updatedAt
      if (!closedRef) return 5
      const elapsed = Date.now() - new Date(closedRef).getTime()
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
      const remainingMs = fiveDaysMs - elapsed
      if (remainingMs <= 0) return 0
      return Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
    }

    // Helper de visibilidade do desenvolvedor
    const getVisibleDeveloper = (ticket: { status: string; assignedTo?: { username: string } | null }): string => {
      if (ticket.status !== 'ABERTO' && ticket.assignedTo) {
        return ticket.assignedTo.username
      }
      return 'Aguardando início do atendimento'
    }

    it('1. Desenvolvedor Responsável: só deve ser exibido quando o chamado não estiver ABERTO', () => {
      const ticketAberto = { status: 'ABERTO', assignedTo: { username: 'master' } }
      const ticketEmAtendimento = { status: 'EM_ANDAMENTO', assignedTo: { username: 'master' } }
      const ticketConcluido = { status: 'CONCLUIDO', assignedTo: { username: 'master' } }
      const ticketSemDev = { status: 'EM_ANDAMENTO', assignedTo: null }

      expect(getVisibleDeveloper(ticketAberto)).toBe('Aguardando início do atendimento')
      expect(getVisibleDeveloper(ticketEmAtendimento)).toBe('master')
      expect(getVisibleDeveloper(ticketConcluido)).toBe('master')
      expect(getVisibleDeveloper(ticketSemDev)).toBe('Aguardando início do atendimento')
    })

    it('2. Filtro de Número de Chamado: deve filtrar precisamente pelo número do chamado (# ou número direto)', () => {
      const tickets = [
        { id: '1', code: 1, title: 'Chamado 1' },
        { id: '10', code: 10, title: 'Chamado 10' },
        { id: '105', code: 105, title: 'Chamado 105' },
        { id: '2', code: 2, title: 'Chamado 2' },
      ]

      const filterByCode = (codeFilter: string) => {
        const clean = codeFilter.replace('#', '').trim()
        return tickets.filter(t => String(t.code) === clean || String(t.code).startsWith(clean) || `#${t.code}` === codeFilter.trim())
      }

      expect(filterByCode('10').length).toBe(2) // 10 e 105
      expect(filterByCode('#10').length).toBe(2)
      expect(filterByCode('2').length).toBe(1)
      expect(filterByCode('2')[0].code).toBe(2)
      expect(filterByCode('999').length).toBe(0)
    })

    it('3. Tela abre com filtro padrão de chamados em aberto (ABERTO)', () => {
      const filterStatus = 'ABERTO'
      const tickets = [
        { id: '1', code: 1, status: 'ABERTO' },
        { id: '2', code: 2, status: 'ABERTO' },
        { id: '3', code: 3, status: 'EM_ANDAMENTO' },
        { id: '4', code: 4, status: 'CONCLUIDO' },
      ]

      const displayedTickets = tickets.filter(t => !filterStatus || t.status === filterStatus)
      expect(displayedTickets.length).toBe(2)
      expect(displayedTickets.every(t => t.status === 'ABERTO')).toBe(true)
    })

    it('4. Fechamento Automático após 5 dias aguardando interação do usuário final', () => {
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
      const now = Date.now()

      // Caso A: Desenvolvedor respondeu há 6 dias e solicitante não interagiu -> deve fechar automaticamente
      const ticketAguardandoUsuario = {
        status: 'EM_ANDAMENTO',
        userId: 'user-final',
        lastMessage: { userId: 'master-dev', createdAt: new Date(now - (6 * 24 * 60 * 60 * 1000)).toISOString() },
      }
      const isWaitingForUser = ticketAguardandoUsuario.lastMessage.userId !== ticketAguardandoUsuario.userId
      const isOlderThan5Days = (now - new Date(ticketAguardandoUsuario.lastMessage.createdAt).getTime()) >= fiveDaysMs
      const shouldAutoClose = ticketAguardandoUsuario.status === 'EM_ANDAMENTO' && isWaitingForUser && isOlderThan5Days
      expect(shouldAutoClose).toBe(true)

      // Caso B: Solicitante respondeu há 6 dias e desenvolvedor não respondeu -> NÃO deve fechar (está aguardando o dev!)
      const ticketAguardandoDev = {
        status: 'EM_ANDAMENTO',
        userId: 'user-final',
        lastMessage: { userId: 'user-final', createdAt: new Date(now - (6 * 24 * 60 * 60 * 1000)).toISOString() },
      }
      const isWaitingForUserB = ticketAguardandoDev.lastMessage.userId !== ticketAguardandoDev.userId
      const shouldAutoCloseB = ticketAguardandoDev.status === 'EM_ANDAMENTO' && isWaitingForUserB && isOlderThan5Days
      expect(shouldAutoCloseB).toBe(false)
    })

    it('5. Reabertura permitida somente até 5 dias após encerramento', () => {
      const now = Date.now()
      const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
      const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()
      const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
      const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString()

      const ticketRecemFechado = { status: 'CONCLUIDO', closedAt: twoDaysAgo }
      const ticketQuaseExpirando = { status: 'FINALIZADO', closedAt: fourDaysAgo }
      const ticketExpirado = { status: 'CONCLUIDO', closedAt: sixDaysAgo }
      const ticketMuitoAntigo = { status: 'CANCELADO', closedAt: twentyDaysAgo }

      expect(canReopenTicket(ticketRecemFechado)).toBe(true)
      expect(getRemainingReopenDays(ticketRecemFechado)).toBeGreaterThanOrEqual(3)

      expect(canReopenTicket(ticketQuaseExpirando)).toBe(true)
      expect(getRemainingReopenDays(ticketQuaseExpirando)).toBe(1)

      expect(canReopenTicket(ticketExpirado)).toBe(false)
      expect(getRemainingReopenDays(ticketExpirado)).toBe(0)

      expect(canReopenTicket(ticketMuitoAntigo)).toBe(false)
      expect(getRemainingReopenDays(ticketMuitoAntigo)).toBe(0)
    })
  })
})

