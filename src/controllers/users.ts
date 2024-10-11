import { Request, Response } from "express";
import { UserModel } from "@/models/User";
import { sendVerificationEmail } from "@/helpers/aws/ses";
import { signatureVerify } from "@polkadot/util-crypto";
import { UserInfo } from "@/types/User";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, company } = req.body;
    if (!email || !password) return res.status(400).send({ error: { message: "Missing email or password" } });

    const newUser = await UserModel.createUser(email, password, name, company);
    if (newUser) {
      await sendVerificationEmail(email, newUser.verifyToken!);
      newUser.verifyToken = undefined;
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

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).send({ error: { message: "Missing user's id" } });

    const user = await UserModel.findOne({ _id: id });
    if (user) {
      const userInfo: UserInfo = {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
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
    const { id } = req.params;
    const { email, name, picture, company, isAdmin, password } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).send({ error: { message: "User not found" } });

    if (email) user.email = email;
    if (name) user.name = name;
    if (picture) user.picture = picture;
    if (company) user.company = company;
    if (typeof isAdmin === "boolean") user.isAdmin = isAdmin;
    if (password) user.password = await UserModel.hashPassword(password);
    await user.save();

    const userInfo: UserInfo = {
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      company: user.company,
      isAdmin: user.isAdmin,
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

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).send({ error: { message: "Missing userId" } });

    const result = await UserModel.deleteOne({ _id: id });
    if (result?.deletedCount > 0) return res.status(200).send({ message: `User '${id}' deleted` });
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
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send({ error: { message: "Missing email or password" } });

    const authToken = await UserModel.login(email, password, true);
    if (authToken) return res.status(200).send({ jwt: authToken });
  } catch (e) {
    console.error(`[ERROR][loginUser] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Invalid login",
    },
  });
};

export const loginUserWithGoogle = async (req: Request, res: Response) => {
  try {
    const { email, name, picture } = req.body;
    if (!email) return res.status(400).send({ error: { message: "Missing email" } });
    const user = await UserModel.findOne({ email });
    if (user) return res.status(200).send({ jwt: user.getAuthToken(true) });
    else {
      await UserModel.createUser(email, "", name, "Google", picture);
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
    const { address, name, signature } = req.body;
    if (!address || !signature) return res.status(400).send({ error: { message: "Missing address or signature" } });

    const { isValid } = signatureVerify(`${address}@PolkadotEducation`, signature, address);
    if (!isValid) return res.status(400).send({ error: { message: "Invalid Signature" } });

    const addr = String(address).toLowerCase();
    const user = await UserModel.findOne({ email: addr });
    if (user) return res.status(200).send({ jwt: user.getAuthToken(true) });
    else {
      await UserModel.createUser(addr, "", name || `${address.slice(0, 5)}...${address.slice(-5)}`, "Web3", "");
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
