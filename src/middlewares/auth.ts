import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "@/environment";
import { UserModel } from "@/models/User";

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Comment here to test endpoints with authentication (app's jwt)
  if (["local", "test"].includes(env.NODE_ENV)) return next();
  const error = {
    status: 401,
    error: "You are not authorized to perform this action.",
  };
  if (!req.headers.authorization) {
    return res.status(error.status).json(error);
  } else {
    const code = req.headers.code?.toString();
    const token = req.headers.authorization?.split(" ")[1];
    try {
      if (token && code) {
        if (code !== env.AUTH_CODE) throw new Error("UNAUTHENTICATED");

        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        if (!decoded.user) {
          throw new Error("UNAUTHENTICATED");
        }
        if (Date.now() >= (decoded.expiresAt || 0) * 1000) {
          throw new Error("SESSION EXPIRED");
        }
        res.locals.auth = token;
        res.locals.user = decoded.user;

        const user = await UserModel.findById(res.locals.user.id);
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        res.locals.populatedUser = user;
        next();
      } else {
        throw new Error("UNAUTHENTICATED");
      }
    } catch (err) {
      error.error = (err as Error).message;
      console.error(`[ERROR][authMiddleware] ${JSON.stringify(error)}`);
      return res.status(error.status).json(error);
    }
  }
};

export default authMiddleware;
