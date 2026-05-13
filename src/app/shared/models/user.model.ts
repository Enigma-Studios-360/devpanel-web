export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}
