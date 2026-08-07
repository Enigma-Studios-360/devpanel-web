import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

/** Roles are PER AULA (independent from the teams RBAC). */
export type ClassroomRole = 'PROFESOR' | 'ALUMNO';
export type SubmissionStatus = 'ENTREGADO' | 'TARDE';

export interface Classroom {
  _id: string;
  name: string;
  description?: string;
  /** 8-char invite code — only meaningful for the PROFESOR. */
  inviteCode: string;
  createdBy: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomMembership {
  _id: string;
  classroomId: string;
  userId: string;
  role: ClassroomRole;
  joinedAt: string;
}

/** Item of GET /api/classrooms — my aulas with my role + member count. */
export interface ClassroomWithRole {
  classroom: Classroom;
  role: ClassroomRole;
  joinedAt: string;
  membersCount: number;
}

/** Roster row. `email` only comes when the viewer is PROFESOR. */
export interface ClassroomMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  role: ClassroomRole;
  joinedAt: string;
}

export interface Assignment {
  _id: string;
  classroomId: string;
  title: string;
  instructions: string;
  /** Optional starter repo in `owner/repo` format. */
  templateRepoFullName?: string;
  dueAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  _id: string;
  assignmentId: string;
  classroomId: string;
  userId: string;
  repoFullName: string;
  /** Server-side receipt — never a client timestamp (D-009). */
  submittedAt: string;
  status: SubmissionStatus;
}

/**
 * Assignment list/detail item. Enrichment depends on the viewer's role:
 *   ALUMNO   -> `mySubmission` (or null)
 *   PROFESOR -> `submissionsCount`
 */
export interface AssignmentListItem {
  assignment: Assignment;
  mySubmission?: Submission | null;
  submissionsCount?: number;
}

/** Submission row with student data (PROFESOR only endpoint). */
export interface SubmissionWithStudent {
  _id: string;
  assignmentId: string;
  student: { userId: string; name: string; email?: string; avatarUrl?: string };
  repoFullName: string;
  submittedAt: string;
  status: SubmissionStatus;
}

export interface JoinClassroomResult {
  classroom: Classroom;
  membership: ClassroomMembership;
  alreadyMember: boolean;
}

export interface CreateClassroomInput {
  name: string;
  description?: string;
}

export interface UpdateClassroomInput {
  name?: string;
  description?: string;
  archived?: boolean;
}

export interface CreateAssignmentInput {
  title: string;
  instructions?: string;
  templateRepoFullName?: string;
  dueAt?: string;
}

export type UpdateAssignmentInput = Partial<CreateAssignmentInput>;

@Injectable({ providedIn: 'root' })
export class ClassroomService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private get base(): string {
    return `${this.api.baseUrl}/api/classrooms`;
  }

  // ---- Classrooms ----------------------------------------------------------

  list(): Observable<ClassroomWithRole[]> {
    return this.http
      .get<ApiSuccess<{ classrooms: ClassroomWithRole[] }>>(this.base)
      .pipe(map((r) => r.data.classrooms));
  }

  create(input: CreateClassroomInput): Observable<Classroom> {
    return this.http
      .post<ApiSuccess<{ classroom: Classroom }>>(this.base, input)
      .pipe(map((r) => r.data.classroom));
  }

  /** Idempotent — `alreadyMember: true` when the user was in the aula. */
  join(inviteCode: string): Observable<JoinClassroomResult> {
    return this.http
      .post<ApiSuccess<JoinClassroomResult>>(`${this.base}/join`, { inviteCode })
      .pipe(map((r) => r.data));
  }

  get(classroomId: string): Observable<{ classroom: Classroom; role: ClassroomRole }> {
    return this.http
      .get<ApiSuccess<{ classroom: Classroom; role: ClassroomRole }>>(
        `${this.base}/${classroomId}`,
      )
      .pipe(map((r) => r.data));
  }

  update(classroomId: string, input: UpdateClassroomInput): Observable<Classroom> {
    return this.http
      .patch<ApiSuccess<{ classroom: Classroom }>>(`${this.base}/${classroomId}`, input)
      .pipe(map((r) => r.data.classroom));
  }

  /** Regenerates the invite code — the previous one stops working. */
  rotateInviteCode(classroomId: string): Observable<Classroom> {
    return this.http
      .post<ApiSuccess<{ classroom: Classroom }>>(
        `${this.base}/${classroomId}/invite-code/rotate`,
        {},
      )
      .pipe(map((r) => r.data.classroom));
  }

  // ---- Members -------------------------------------------------------------

  members(classroomId: string): Observable<ClassroomMember[]> {
    return this.http
      .get<ApiSuccess<{ members: ClassroomMember[] }>>(
        `${this.base}/${classroomId}/members`,
      )
      .pipe(map((r) => r.data.members));
  }

  removeMember(classroomId: string, userId: string): Observable<boolean> {
    return this.http
      .delete<ApiSuccess<{ removed: boolean }>>(
        `${this.base}/${classroomId}/members/${userId}`,
      )
      .pipe(map((r) => r.data.removed));
  }

  // ---- Assignments ---------------------------------------------------------

  createAssignment(
    classroomId: string,
    input: CreateAssignmentInput,
  ): Observable<Assignment> {
    return this.http
      .post<ApiSuccess<{ assignment: Assignment }>>(
        `${this.base}/${classroomId}/assignments`,
        input,
      )
      .pipe(map((r) => r.data.assignment));
  }

  listAssignments(classroomId: string): Observable<AssignmentListItem[]> {
    return this.http
      .get<ApiSuccess<{ assignments: AssignmentListItem[] }>>(
        `${this.base}/${classroomId}/assignments`,
      )
      .pipe(map((r) => r.data.assignments));
  }

  getAssignment(
    classroomId: string,
    assignmentId: string,
  ): Observable<AssignmentListItem> {
    return this.http
      .get<ApiSuccess<AssignmentListItem>>(
        `${this.base}/${classroomId}/assignments/${assignmentId}`,
      )
      .pipe(map((r) => r.data));
  }

  updateAssignment(
    classroomId: string,
    assignmentId: string,
    input: UpdateAssignmentInput,
  ): Observable<Assignment> {
    return this.http
      .patch<ApiSuccess<{ assignment: Assignment }>>(
        `${this.base}/${classroomId}/assignments/${assignmentId}`,
        input,
      )
      .pipe(map((r) => r.data.assignment));
  }

  // ---- Submissions ---------------------------------------------------------

  /** ALUMNO. Re-submitting updates the same document (status recomputed). */
  submit(
    classroomId: string,
    assignmentId: string,
    repoFullName: string,
  ): Observable<Submission> {
    return this.http
      .post<ApiSuccess<{ submission: Submission }>>(
        `${this.base}/${classroomId}/assignments/${assignmentId}/submit`,
        { repoFullName },
      )
      .pipe(map((r) => r.data.submission));
  }

  /** PROFESOR only. */
  listSubmissions(
    classroomId: string,
    assignmentId: string,
  ): Observable<SubmissionWithStudent[]> {
    return this.http
      .get<ApiSuccess<{ submissions: SubmissionWithStudent[] }>>(
        `${this.base}/${classroomId}/assignments/${assignmentId}/submissions`,
      )
      .pipe(map((r) => r.data.submissions));
  }
}
