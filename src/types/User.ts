export type UserInfo = {
  userId: string;
  email: string;
  name: string;
  company: string;
  isAdmin: boolean;
  lastActivity: Date;
  verifyToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
