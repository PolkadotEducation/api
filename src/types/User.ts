export type UserInfo = {
  userId: string;
  email: string;
  name: string;
  language: string;
  company: string;
  picture: string;
  isAdmin: boolean;
  lastActivity: Date;
  verifyToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
