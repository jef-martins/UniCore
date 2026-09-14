import { describe, expect, it } from 'vitest'

describe('Regras de Coordenação e Vinculação de Cursos', () => {
  interface CourseSetting {
    academicCourseId: string
    courseName: string
    courseEmail: string | null
    coordinatorEmail: string | null
    coordinatorUserId: string | null
  }

  interface Course {
    id: string
    name: string
    offered: boolean
  }

  function filterCoursesForCoordinator(
    allCourses: Course[],
    settings: CourseSetting[],
    coordinatorUser: { id: string; email: string; role: string },
    isCoordinationMenu = false,
  ): Course[] {
    if (!isCoordinationMenu && (coordinatorUser.role === 'admin' || coordinatorUser.role === 'master')) {
      return allCourses
    }
    const userEmail = coordinatorUser.email.toLowerCase()
    const allowedIds = new Set(
      settings
        .filter(
          (s) =>
            s.coordinatorUserId === coordinatorUser.id ||
            (s.coordinatorEmail && s.coordinatorEmail.toLowerCase() === userEmail)
        )
        .map((s) => s.academicCourseId)
    )
    return allCourses.filter((c) => allowedIds.has(c.id))
  }

  function buildClassroomTeachersList(
    teacherEmail: string | null,
    courseSetting?: CourseSetting,
  ): string[] {
    const list = new Set<string>()
    if (teacherEmail?.trim()) {
      list.add(teacherEmail.trim().toLowerCase())
    }
    if (courseSetting?.courseEmail?.trim()) {
      list.add(courseSetting.courseEmail.trim().toLowerCase())
    }
    if (courseSetting?.coordinatorEmail?.trim()) {
      list.add(courseSetting.coordinatorEmail.trim().toLowerCase())
    }
    return [...list]
  }

  const sampleCourses: Course[] = [
    { id: '101', name: 'DIREITO', offered: true },
    { id: '102', name: 'ADMINISTRAÇÃO', offered: true },
    { id: '103', name: 'PEDAGOGIA', offered: true },
    { id: '104', name: 'ENGENHARIA CIVIL', offered: false },
  ]

  const sampleSettings: CourseSetting[] = [
    {
      academicCourseId: '101',
      courseName: 'DIREITO',
      courseEmail: 'direito@classroom.faip.edu.br',
      coordinatorEmail: 'coordenador.direito@faip.edu.br',
      coordinatorUserId: 'user-uuid-1',
    },
    {
      academicCourseId: '102',
      courseName: 'ADMINISTRAÇÃO',
      courseEmail: 'adm@classroom.faip.edu.br',
      coordinatorEmail: 'coordenador.adm@faip.edu.br',
      coordinatorUserId: 'user-uuid-2',
    },
    {
      academicCourseId: '103',
      courseName: 'PEDAGOGIA',
      courseEmail: 'pedagogia@classroom.faip.edu.br',
      coordinatorEmail: 'jefferson.martins@telecontrol.com.br',
      coordinatorUserId: null, // vinculado apenas por e-mail
    },
  ]

  it('deve retornar apenas os cursos atribuídos ao coordenador logado', () => {
    const coord1 = { id: 'user-uuid-1', email: 'coordenador.direito@faip.edu.br', role: 'coordenacao' }
    const filtered = filterCoursesForCoordinator(sampleCourses, sampleSettings, coord1)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('101')
    expect(filtered[0].name).toBe('DIREITO')
  })

  it('deve retornar lista vazia caso o coordenador não possua cursos vinculados', () => {
    const coordSemCursos = { id: 'user-uuid-99', email: 'novo.coord@faip.edu.br', role: 'coordenacao' }
    const filtered = filterCoursesForCoordinator(sampleCourses, sampleSettings, coordSemCursos)
    expect(filtered).toHaveLength(0)
  })

  it('deve retornar todos os cursos se o perfil for admin ou master fora do menu coordenação', () => {
    const admin = { id: 'admin-uuid', email: 'admin@unicore.local', role: 'admin' }
    const master = { id: 'master-uuid', email: 'master@unicore.local', role: 'master' }

    expect(filterCoursesForCoordinator(sampleCourses, sampleSettings, admin, false)).toHaveLength(4)
    expect(filterCoursesForCoordinator(sampleCourses, sampleSettings, master, false)).toHaveLength(4)
  })

  it('deve retornar apenas os cursos em que sou coordenador quando estiver no menu coordenação, mesmo sendo admin ou master', () => {
    const adminAsCoord = { id: 'user-uuid-1', email: 'coordenador.direito@faip.edu.br', role: 'admin' }
    const filtered = filterCoursesForCoordinator(sampleCourses, sampleSettings, adminAsCoord, true)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('101')
  })

  it('deve retornar vazio se estiver no menu coordenação e o usuário não for coordenador de nenhum curso', () => {
    const adminWithoutCoordCourse = { id: 'admin-without-courses', email: 'admin@unicore.local', role: 'admin' }
    const filtered = filterCoursesForCoordinator(sampleCourses, sampleSettings, adminWithoutCoordCourse, true)
    expect(filtered).toHaveLength(0)
  })

  it('deve vincular curso estritamente por e-mail mesmo sem ID associado (e-mail como chave)', () => {
    const userByEmail = { id: 'random-uuid-999', email: 'jefferson.martins@telecontrol.com.br', role: 'coordenacao' }
    const filtered = filterCoursesForCoordinator(sampleCourses, sampleSettings, userByEmail, true)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('103')
    expect(filtered[0].name).toBe('PEDAGOGIA')
  })

  it('deve montar a lista de co-professores com Docente, Coordenador e E-mail do Curso sem duplicação', () => {
    const teachers = buildClassroomTeachersList('prof.carlos@professor.faip.edu.br', sampleSettings[0])
    expect(teachers).toHaveLength(3)
    expect(teachers).toContain('prof.carlos@professor.faip.edu.br')
    expect(teachers).toContain('direito@classroom.faip.edu.br')
    expect(teachers).toContain('coordenador.direito@faip.edu.br')
  })

  it('deve lidar corretamente caso não haja e-mail de curso ou coordenador configurados', () => {
    const teachers = buildClassroomTeachersList('prof.ana@professor.faip.edu.br', undefined)
    expect(teachers).toEqual(['prof.ana@professor.faip.edu.br'])
  })

  it('deve listar apenas usuários com perfil de coordenação para atribuição de cursos', () => {
    const users = [
      { id: '1', username: 'Coordenador Direito', email: 'direito@faip.edu.br', role: 'coordenacao' },
      { id: '2', username: 'Administrador Geral', email: 'admin@faip.edu.br', role: 'admin' },
      { id: '3', username: 'Master User', email: 'master@faip.edu.br', role: 'master' },
      { id: '4', username: 'Coordenadora Pedagogia', email: 'pedagogia@faip.edu.br', role: 'COORDENACAO' },
    ]
    const filtered = users.filter((u) => u.role.toLowerCase() === 'coordenacao')
    expect(filtered).toHaveLength(2)
    expect(filtered.map((c) => c.id)).toEqual(['1', '4'])
  })

  it('deve filtrar salas ativas do Google Classroom para exibir somente as vinculadas à coordenação', () => {
    const googleRooms = [
      { id: 'g1', name: 'Direito Civil I', teachers: [{ email: 'direito@classroom.faip.edu.br' }] },
      { id: 'g2', name: 'Enfermagem Clínica', teachers: [{ email: 'enfermagem@classroom.faip.edu.br' }] },
      { id: 'g3', name: 'Tópicos Especiais', teachers: [{ email: 'prof.isadora@professor.faip.edu.br' }] },
    ]

    const coordinatedEmails = new Set(['direito@classroom.faip.edu.br', 'coordenador.direito@faip.edu.br'])
    const filtered = googleRooms.filter((r) => r.teachers.some((t) => coordinatedEmails.has(t.email)))

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('g1')
  })

  it('deve resolver o usuário efetivo do contexto de coordenação quando master ou admin seleciona um coordenador', () => {
    const loggedUser = { id: 'master-uuid', username: 'master', email: 'master@unicore.local', role: 'master' }
    const contextUser = { id: 'coord-uuid-1', username: 'coordenacao', email: 'coordenacao@unicore.local', role: 'coordenacao' }

    function getEffectiveUser(
      routeUrl: string,
      currentUser: typeof loggedUser,
      sectorContext: { user: typeof contextUser; sector: string } | null,
    ) {
      if (routeUrl.startsWith('/coordenacao') && sectorContext?.sector === 'coordenacao' && sectorContext.user) {
        return sectorContext.user
      }
      return currentUser
    }

    // 1. Em rota /coordenacao/classroom com contexto ativo selecionado
    const effectiveInCoordination = getEffectiveUser('/coordenacao/classroom', loggedUser, {
      user: contextUser,
      sector: 'coordenacao',
    })
    expect(effectiveInCoordination.email).toBe('coordenacao@unicore.local')
    expect(effectiveInCoordination.username).toBe('coordenacao')

    // 2. Em rota fora de coordenação (/desenvolvedor), mantém o master
    const effectiveInDeveloper = getEffectiveUser('/desenvolvedor/database', loggedUser, {
      user: contextUser,
      sector: 'coordenacao',
    })
    expect(effectiveInDeveloper.email).toBe('master@unicore.local')

    // 3. Em rota de coordenação sem contexto específico, cai no usuário atual
    const effectiveWithoutContext = getEffectiveUser('/coordenacao/classroom', loggedUser, null)
    expect(effectiveWithoutContext.email).toBe('master@unicore.local')
  })

  it('deve filtrar os cursos pelo usuário efetivo do contexto de coordenação e não pelo login master', () => {
    const contextCoordinator = { id: 'user-uuid-1', email: 'coordenador.direito@faip.edu.br', role: 'coordenacao' }
    const filtered = filterCoursesForCoordinator(sampleCourses, sampleSettings, contextCoordinator, true)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('DIREITO')

    const contextCoordinatorWithoutCourses = { id: 'coord-sem-cursos', email: 'coordenacao@unicore.local', role: 'coordenacao' }
    const filteredEmpty = filterCoursesForCoordinator(sampleCourses, sampleSettings, contextCoordinatorWithoutCourses, true)
    expect(filteredEmpty).toHaveLength(0)
  })

  it('deve filtrar disciplinas de salas do Google Classroom quando um curso for selecionado e mostrar todas quando for "Selecione um curso"', () => {
    const googleCourses = [
      { id: '1', name: 'Tópicos Especiais II', section: '8º Termo Enfermagem Diurno', teachers: [{ name: 'Sala de Aula Enfermagem Diurno' }] },
      { id: '2', name: 'Atividades de Extensão X', section: '10º- Termo: - Enfermagem - 2026/2', teachers: [{ name: 'Sala de Aula Enfermagem' }] },
      { id: '3', name: 'Teoria e Prática da EJA', section: '1º- Termo: - Pedagogia - 2026/2', teachers: [{ name: 'Sala de Aula Pedagogia' }] },
      { id: '4', name: 'Projeto Estrutural', section: '4 º- Termo: - Engenharia Civil - 2026/2', teachers: [{ name: 'Sala de Aula Engenharia Civil' }] },
    ]

    function normalize(val: string | null | undefined): string {
      return (val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    }

    function isMatch(gc: typeof googleCourses[0], courseName: string): boolean {
      const normCourse = normalize(courseName)
      const text = [gc.name, gc.section, ...gc.teachers.map((t) => t.name)].map(normalize).join(' ')
      if (text.includes(normCourse)) return true
      const words = normCourse.split(/[\s-]+/).filter((w) => w.length >= 3)
      if (words.length > 1 && words.every((w) => text.includes(w))) return true
      return false
    }

    function filterDisciplinas(selectedCourseId: string, courseName?: string) {
      if (!selectedCourseId) {
        // "Selecione um curso": exibe todas as disciplinas
        return googleCourses
      }
      return googleCourses.filter((gc) => isMatch(gc, courseName || ''))
    }

    // 1. Quando o curso ENFERMAGEM for selecionado no select acima
    const enfermagemRooms = filterDisciplinas('44', 'ENFERMAGEM')
    expect(enfermagemRooms).toHaveLength(2)
    expect(enfermagemRooms.map((r) => r.id)).toEqual(['1', '2'])

    // 2. Quando o curso PEDAGOGIA for selecionado
    const pedagogiaRooms = filterDisciplinas('5', 'PEDAGOGIA')
    expect(pedagogiaRooms).toHaveLength(1)
    expect(pedagogiaRooms[0].id).toBe('3')

    // 3. Quando for "Selecione um curso" (vazio) -> exibe todas as 4 salas
    const allRooms = filterDisciplinas('')
    expect(allRooms).toHaveLength(4)
  })
})
