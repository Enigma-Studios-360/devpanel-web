export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TASK_STATUS_VALUES: TaskStatus[] = [
  'TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE',
];

export const TASK_PRIORITY_VALUES: TaskPriority[] = [
  'LOW', 'MEDIUM', 'HIGH', 'URGENT',
];

export interface Assignee {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Task {
  _id: string;
  project: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: Assignee[] | string[];
  dueDate?: string;
  githubIssueNumber?: number;
  attachments: string[];
  createdBy: string | Assignee;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  _id: string;
  task: string;
  user: Assignee | string;
  message: string;
  createdAt: string;
  updatedAt: string;
}
