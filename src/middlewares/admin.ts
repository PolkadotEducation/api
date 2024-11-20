import { NextFunction, Request, Response } from "express";

const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const error = {
    status: 403,
    error: "You do not have the required permissions to access this resource.",
  };
  try {
    const user = res.locals.user;
    if (!user || !user.isAdmin) {
      throw new Error("ACCESS_DENIED");
    }
    next();
  } catch (err) {
    error.error = (err as Error).message;
    console.error(`[ERROR][adminMiddleware] ${JSON.stringify(error)}`);
    return res.status(error.status).json(error);
  }
};

export default adminMiddleware;
