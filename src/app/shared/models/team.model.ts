import type { PlanCode } from './plan.model';

export type TeamRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
export type TeamMemberStatus = 'ACTIVE' | 'INVITED' | 'REJECTED';

export interface Team {
  _id: string;
  name: string;
  slug: string;
  owner: string;
  plan: PlanCode;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  _id: string;
  team: string;
  user: string;
  role: TeamRole;
  status: TeamMemberStatus;
  invitedBy?: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}
