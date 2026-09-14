import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'

export interface IntegrationConnection {
  configured: boolean
  reachable: boolean
  message: string
  cachedCourses?: number
  cachedClasses?: number
  cachedStudents?: number
}

export interface UnimestreStatus {
  unimestre: IntegrationConnection
  faip: IntegrationConnection
  local?: IntegrationConnection
}

export interface UnimestreCourse {
  id: string
  name: string
  offered: boolean
  cached?: boolean
  courseEmail?: string | null
  coordinatorEmail?: string | null
  coordinatorUserId?: string | null
  coordinatorName?: string | null
}

export interface UnimestreClassroom {
  googleCourseId: string | null
  alternateLink: string | null
  status: string | null
}

export interface UnimestreClass {
  classGroup: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  teacherEmail: string | null
  studentCount: number
  classroom: UnimestreClassroom | null
  cached?: boolean
}

export interface UnimestreStudent {
  id: string
  name: string
  email: string | null
  cached?: boolean
}

export interface CoordinatorUser {
  id: string
  username: string
  email: string
  role: string
}

export interface AcademicCourseSetting {
  academicCourseId: string
  courseName: string
  courseEmail: string | null
  coordinatorEmail: string | null
  coordinatorUserId: string | null
  coordinatorUser?: { id: string; username: string; email: string } | null
  updatedAt?: string
}

export interface UpdateCourseSettingPayload {
  courseName: string
  courseEmail?: string | null
  coordinatorEmail?: string | null
  coordinatorUserId?: string | null
}

@Injectable({ providedIn: 'root' })
export class UnimestreService {
  constructor(private readonly http: HttpClient) {}

  status() {
    return this.http.get<UnimestreStatus>('/api/unimestre/status')
  }

  courses(semester: string) {
    return this.http.get<UnimestreCourse[]>('/api/unimestre/courses', {
      params: new HttpParams().set('semester', semester),
    })
  }

  classes(semester: string, course: string) {
    return this.http.get<UnimestreClass[]>('/api/unimestre/classes', {
      params: new HttpParams().set('semester', semester).set('course', course),
    })
  }

  students(semester: string, course: string, subject: string, classGroup: string) {
    const params = new HttpParams()
      .set('semester', semester)
      .set('course', course)
      .set('subject', subject)
      .set('classGroup', classGroup)
    return this.http.get<UnimestreStudent[]>('/api/unimestre/students', { params })
  }

  getCoordinators() {
    return this.http.get<CoordinatorUser[]>('/api/unimestre/coordinators')
  }

  getCourseSettings() {
    return this.http.get<AcademicCourseSetting[]>('/api/unimestre/course-settings')
  }

  updateCourseSetting(courseId: string, data: UpdateCourseSettingPayload) {
    return this.http.put<AcademicCourseSetting>(`/api/unimestre/course-settings/${courseId}`, data)
  }
}
