import { TeamInfo } from "./Team";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  language: string;
  company: string;
  picture: string;
  teams?: TeamInfo[];
  isAdmin: boolean;
  lastActivity: Date;
  verify?: VerifyUser;
  recover?: RecoverPassword;
  createdAt?: Date;
  updatedAt?: Date;
}

export type VerifyUser = {
  token: string;
  date: Date;
};

export type RecoverPassword = {
  token: string;
  date: Date;
};
