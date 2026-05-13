export type PlanCode = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'SCHOOL';

export interface PlanLimits {
  maxProjects: number;
  maxMembers: number;
  maxStorageMb: number;
  maxTasks: number | null;
  canDownloadReadme: boolean;
  canUseGithubPrivateRepos: boolean;
  canUseAdvancedDeployWizard: boolean;
}

export interface Plan {
  code: PlanCode;
  name: string;
  priceMonthly: number | null;
  description: string;
  highlights: string[];
}
