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
  achievementsTracker?: AchievementsTracker;
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

export type AchievementsTracker = {
  loginCounter: number;
  lastLogin: Date;
  answerCounter: number;
  challengeCounter: number;
  finishOneCourse: boolean;
  finishOneCourseNoMistakes: boolean;
  totalFocus: boolean;
};
