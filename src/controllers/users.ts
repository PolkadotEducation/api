import { Request, Response } from "express";
import * as crypto from "crypto";

import { UserModel } from "@/models/User";
import { sendRecoverEmail, sendVerificationEmail } from "@/helpers/aws/ses";
import { signatureVerify } from "@polkadot/util-crypto";
import { UserInfo } from "@/types/User";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, company, language } = req.body;
    if (!email || !password) return res.status(400).send({ error: { message: "Missing email or password" } });

    const newUser = await UserModel.createUser({
      email,
      password,
      name,
      company,
      language,
      signInType: "Email",
    });
    if (newUser && newUser.verify) {
      await sendVerificationEmail(email, newUser.verify.token);
      newUser.verify = undefined;
      return res.status(200).send(newUser);
    }
  } catch (e) {
    console.error(`[ERROR][createUser] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "User not created (already exists?)",
    },
  });
};

export const verifyUser = async (req: Request, res: Response) => {
  let message = "User can not be verified";
  try {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).send({ error: { message: "Missing email or token" } });

    const user = await UserModel.findOne({ email });
    if (user && user.verify?.token === String(token)) {
      const oneDay = new Date();
      oneDay.setDate(oneDay.getDate() - 1);
      if (user.verify.date >= oneDay) {
        user.verify = undefined;
        // We also get rid of recovery lock, just in case
        user.recover = undefined;
        await user.save();
        return res.status(200).send(user);
      } else {
        message = "Verification has expired";
      }
    }
  } catch (e) {
    console.error(`[ERROR][verifyUser] ${e}`);
    message = String(e);
  }

  return res.status(400).send({ error: { message } });
};

export const recoverUser = async (req: Request, res: Response) => {
  let message = "";
  try {
    const { email, token, password } = req.body;
    if (!email) return res.status(400).send({ error: { message: "Missing email" } });

    const user = await UserModel.findOne({ email });
    if (user) {
      // No token means we are starting the workflow
      if (!token) {
        // One hour cooldown for new requests
        const oneHour = new Date();
        oneHour.setHours(oneHour.getHours() - 1);
        if (!user.recover || user.recover.date < oneHour) {
          user.recover = {
            token: crypto.randomBytes(16).toString("hex"),
            date: new Date(),
          };
          await user.save();
          await sendRecoverEmail(email, user.recover.token);
        } else {
          message = "Recovery already started";
        }
      } else {
        if (user && password && user.recover?.token === String(token)) {
          const oneDay = new Date();
          oneDay.setDate(oneDay.getDate() - 1);
          if (user.recover.date >= oneDay) {
            user.recover = undefined;
            // We also get rid of verification lock, just in case
            user.verify = undefined;
            user.password = await UserModel.hashPassword(password);
            await user.save();
          } else {
            message = "Recovery has expired";
          }
        } else {
          message = "User can not be recovered";
        }
      }
    } else {
      message = "User can not be recovered";
    }

    if (!message) return res.status(200).send(true);
  } catch (e) {
    console.error(`[ERROR][recoverUser] ${e}`);
    message = String(e);
  }

  return res.status(400).send({ error: { message } });
};

export const getUser = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals?.populatedUser?._id;
    if (!userId) return res.status(400).send({ error: { message: "Missing user's id" } });

    const user = await UserModel.findOne({ _id: userId });
    if (user) {
      const userInfo: UserInfo = {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        language: user.language,
        company: user.company,
        isAdmin: user.isAdmin,
        lastActivity: user.lastActivity,
      };
      return res.status(200).send(userInfo);
    }
  } catch (e) {
    console.error(`[ERROR][getUser] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "User not found",
    },
  });
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = res.locals?.populatedUser?._id;
    const { email, name, picture, company, isAdmin, password, language } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).send({ error: { message: "User not found" } });

    if (email) user.email = email;
    if (name) user.name = name;
    if (picture) user.picture = picture;
    if (company) user.company = company;
    if (typeof isAdmin === "boolean") user.isAdmin = isAdmin;
    if (password) user.password = await UserModel.hashPassword(password);
    if (language) user.language = language;
    await user.save();

    const userInfo: UserInfo = {
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      company: user.company,
      isAdmin: user.isAdmin,
      language: user.language,
      lastActivity: user.lastActivity,
    };
    return res.status(200).send(userInfo);
  } catch (e) {
    console.error(`[ERROR][updateUser] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "User not updated",
    },
  });
};

export const deleteUser = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals?.populatedUser?._id;
    if (!userId) return res.status(400).send({ error: { message: "Missing userId" } });

    const result = await UserModel.deleteOne({ _id: userId });
    if (result?.deletedCount > 0) return res.status(200).send({ message: `User '${userId}' deleted` });
  } catch (e) {
    console.error(`[ERROR][deleteUser] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "User not deleted",
    },
  });
};

export const loginUser = async (req: Request, res: Response) => {
  let message = "Invalid login";
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send({ error: { message: "Missing email or password" } });

    const authToken = await UserModel.login(email, password, true);
    if (authToken) return res.status(200).send({ jwt: authToken });
  } catch (e) {
    console.error(`[ERROR][loginUser] ${e}`);
    message = String(e);
  }
  return res.status(400).send({ error: { message } });
};

export const loginUserWithGoogle = async (req: Request, res: Response) => {
  try {
    const { email, name, picture, language } = req.body;
    if (!email) return res.status(400).send({ error: { message: "Missing email" } });
    const user = await UserModel.findOne({ email });
    if (user) return res.status(200).send({ jwt: user.getAuthToken(true) });
    else {
      await UserModel.createUser({
        email,
        password: "",
        name,
        company: "Google",
        picture,
        language,
        signInType: "Google",
      });
      const user = await UserModel.findOne({ email });
      if (user) return res.status(200).send({ jwt: user.getAuthToken(true) });
    }
  } catch (e) {
    console.error(`[ERROR][loginUserWithGoogle] ${e}`);
  }
  return res.status(400).send({
    error: {
      message: "Invalid login",
    },
  });
};

export const loginUserWithWallet = async (req: Request, res: Response) => {
  try {
    const { address, name, signature, language } = req.body;
    if (!address || !signature) return res.status(400).send({ error: { message: "Missing address or signature" } });

    const { isValid } = signatureVerify(`${address}@PolkadotEducation`, signature, address);
    if (!isValid) return res.status(400).send({ error: { message: "Invalid Signature" } });

    const addr = String(address).toLowerCase();
    const user = await UserModel.findOne({ email: addr });
    if (user) return res.status(200).send({ jwt: user.getAuthToken(true) });
    else {
      await UserModel.createUser({
        email: addr,
        password: "",
        name: name || `${address.slice(0, 5)}...${address.slice(-5)}`,
        company: "Web3",
        language,
        signInType: "Web3",
      });
      const user = await UserModel.findOne({ email: addr });
      if (user) return res.status(200).send({ jwt: user.getAuthToken(true) });
    }
  } catch (e) {
    console.error(`[ERROR][loginUserWithWallet] ${e}`);
  }
  return res.status(400).send({
    error: {
      message: "Invalid login",
    },
  });
};
