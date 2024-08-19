import { Request, Response } from "express";
import { UserModel } from "@/models/User";
import { sendVerificationEmail } from "@/helpers/aws/ses";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).send({ error: { message: "Missing email or password" } });
    }

    const newUser = await UserModel.createUser(email, password, name);
    if (newUser) {
      await sendVerificationEmail(email, newUser.verifyToken!);
      newUser.verifyToken = undefined;
      return res.status(200).send(newUser);
    }
  } catch (e) {
    console.log(`[ERROR][createUser] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "User not created (already exists?)",
    },
  });
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).send({ error: { message: "Missing userId" } });
    }
    const user = await UserModel.findOne({ _id: userId }, { email: 1, name: 1 });
    if (user) return res.status(200).send(user);
  } catch (e) {
    console.log(`[ERROR][getUser] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "User not found",
    },
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({ error: { message: "Missing email" } });
    }

    const result = await UserModel.deleteOne({ email });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `User '${email}' deleted` });
    }
  } catch (e) {
    console.log(`[ERROR][deleteUser] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "User not deleted",
    },
  });
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({ error: { message: "Missing email or password" } });
    }
    const authToken = await UserModel.login(email, password, true);
    if (authToken) {
      return res.status(200).send({ jwt: authToken });
    }
  } catch (e) {
    console.log(`[ERROR][loginUser] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Invalid login",
    },
  });
};
