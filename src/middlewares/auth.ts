import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "@/environment";
import { UserModel } from "@/models/User";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = {
    status: 401,
    error: "You are not authorized to perform this action.",
  };
  if (!req.headers.authorization) {
    return res.status(error.status).json(error);
  } else {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        if (!decoded.user) {
          error.status = 401;
          throw new Error("UNAUTHENTICATED");
        }
        if (Date.now() >= (decoded.expiresAt || 0) * 1000) {
          error.status = 401;
          throw new Error("SESSION EXPIRED");
        }
        res.locals.auth = token;
        res.locals.user = decoded.user;

        const user = await UserModel.findById(res.locals.user.id);
        if (!user) {
          error.status = 401;
          throw new Error("USER_NOT_FOUND");
        }
        res.locals.populatedUser = user;
        next();
      } catch (err) {
        error.error = (err as Error).message;
        return res.status(error.status).json(error);
      }
    }
  }
};

export default authMiddleware;
