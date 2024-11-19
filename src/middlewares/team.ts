import { NextFunction, Request, Response } from "express";

import { UserTeamModel } from "@/models/UserTeam";

const teamMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const error = {
    status: 403,
    error: "You must be a team member to access this resource.",
  };
  try {
    const teamId = req.query.teamId || req.body.teamId;
    const email = res.locals?.user?.email;
    const isMember = await UserTeamModel.findOne({ email, teamId });
    if (!isMember) throw new Error("ACCESS_DENIED");
    next();
  } catch (err) {
    error.error = (err as Error).message;
    console.error(`[ERROR][teamMiddleware] ${JSON.stringify(error)}`);
    return res.status(error.status).json(error);
  }
};

export default teamMiddleware;
