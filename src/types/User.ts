export type UserInfo = {
  userId: string;
  email: string;
  name: string;
  lastActivity: Date;
  verifyToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
