import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/public/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing').then((m) => m.PricingComponent),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then(
            (m) => m.RegisterComponent,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/home-dashboard/home-dashboard').then(
            (m) => m.HomeDashboardComponent,
          ),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./features/pricing/pricing').then((m) => m.PricingComponent),
      },

      // Teams ----------------------------------------------------------------
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/teams/teams-list').then((m) => m.TeamsListComponent),
      },
      {
        path: 'teams/:teamId',
        loadComponent: () =>
          import('./features/teams/team-detail').then((m) => m.TeamDetailComponent),
      },
      {
        path: 'teams/:teamId/projects',
        loadComponent: () =>
          import('./features/projects/projects-list').then(
            (m) => m.ProjectsListComponent,
          ),
      },

      // Projects -------------------------------------------------------------
      {
        // Global projects page: every project across the user's teams.
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/all-projects').then(
            (m) => m.AllProjectsComponent,
          ),
      },
      {
        path: 'projects/:projectId/overview',
        loadComponent: () =>
          import('./features/projects/project-overview').then(
            (m) => m.ProjectOverviewComponent,
          ),
      },
      {
        path: 'projects/:projectId/tasks',
        loadComponent: () =>
          import('./features/tasks/tasks-board').then(
            (m) => m.TasksBoardComponent,
          ),
      },
      {
        path: 'projects/:projectId/docs',
        loadComponent: () =>
          import('./features/docs/project-docs').then(
            (m) => m.ProjectDocsComponent,
          ),
      },
      {
        path: 'projects/:projectId/github',
        loadComponent: () =>
          import('./features/github/project-github').then(
            (m) => m.ProjectGithubComponent,
          ),
      },
      {
        path: 'projects/:projectId/deploy',
        loadComponent: () =>
          import('./features/deploy/project-deploy').then(
            (m) => m.ProjectDeployComponent,
          ),
      },
      {
        path: 'projects/:projectId/files',
        loadComponent: () =>
          import('./features/files/project-files').then(
            (m) => m.ProjectFilesComponent,
          ),
      },

      // Phase 3+ placeholders
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/coming-soon').then((m) => m.ComingSoonComponent),
        data: { title: 'Tareas', subtitle: 'Tablero Kanban por proyecto.', phase: 'Fase 3' },
      },
      {
        path: 'docs',
        redirectTo: 'teams',
        pathMatch: 'full',
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./features/coming-soon').then((m) => m.ComingSoonComponent),
        data: { title: 'Actividad', subtitle: 'Cronología de cambios.', phase: 'Fase 3' },
      },
      {
        path: 'github',
        redirectTo: 'teams',
        pathMatch: 'full',
      },
      {
        // Global "Deploy" entry: per-project, so we send the user to pick a project first.
        path: 'deploy',
        redirectTo: 'teams',
        pathMatch: 'full',
      },
      {
        // Global "Files" entry: per-project, so we send the user to pick a project first.
        path: 'files',
        redirectTo: 'teams',
        pathMatch: 'full',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
