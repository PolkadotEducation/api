import { Request, Response } from "express";
import { UserModel } from "@/models/User";
import { sendVerificationEmail } from "@/helpers/aws/ses";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, company, isAdmin } = req.body;
    if (!email || !password) return res.status(400).send({ error: { message: "Missing email or password" } });

    const newUser = await UserModel.createUser(email, password, name, company, isAdmin);
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
    const { id } = req.params;
    if (!id) return res.status(400).send({ error: { message: "Missing userId" } });

    const user = await UserModel.findOne({ _id: id }, { email: 1, name: 1, company: 1, isAdmin: 1 });
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

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, company, isAdmin, password } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).send({ error: { message: "User not found" } });

    if (email) user.email = email;
    if (name) user.name = name;
    if (company) user.company = company;
    if (typeof isAdmin === "boolean") user.isAdmin = isAdmin;
    if (password) user.password = await UserModel.hashPassword(password);
    await user.save();

    return res.status(200).send({
      email: user.email,
      name: user.name,
      company: user.company,
      isAdmin: user.isAdmin,
    });
  } catch (e) {
    console.log(`[ERROR][updateUser] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "User not updated",
    },
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).send({ error: { message: "Missing userId" } });

    const result = await UserModel.deleteOne({ _id: id });
    if (result?.deletedCount > 0) return res.status(200).send({ message: `User '${id}' deleted` });
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
    if (!email || !password) return res.status(400).send({ error: { message: "Missing email or password" } });

    const authToken = await UserModel.login(email, password, true);
    if (authToken) return res.status(200).send({ jwt: authToken });
  } catch (e) {
    console.log(`[ERROR][loginUser] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Invalid login",
    },
  });
};
