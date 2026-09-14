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
  ): Course[] {
    if (coordinatorUser.role === 'admin' || coordinatorUser.role === 'master') {
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

  it('deve retornar todos os cursos se o perfil for admin ou master', () => {
    const admin = { id: 'admin-uuid', email: 'admin@unicore.local', role: 'admin' }
    const master = { id: 'master-uuid', email: 'master@unicore.local', role: 'master' }

    expect(filterCoursesForCoordinator(sampleCourses, sampleSettings, admin)).toHaveLength(4)
    expect(filterCoursesForCoordinator(sampleCourses, sampleSettings, master)).toHaveLength(4)
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
})
