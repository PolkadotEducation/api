import { DocumentType, ReturnModelType, getModelForClass, prop } from "@typegoose/typegoose";
import moment from "moment";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import * as bcrypt from "bcrypt";

import { env } from "@/environment";
import BaseModel from "./BaseModel";
import { UserInfo } from "@/types/User";

class User extends BaseModel {
  @prop({ required: true, unique: true, type: String })
  public email: string;

  @prop({ required: true, type: String })
  public password: string;

  @prop({ required: true, type: String })
  public name: string;

  @prop({ required: true, type: String, default: "" })
  public company: string;

  @prop({ required: true, type: Boolean, default: false })
  public isAdmin: boolean;

  @prop({ required: false, type: String })
  public verifyToken?: string;

  @prop({ required: false, type: Date })
  public lastActivity: Date;

  public static async hashPassword(password: string) {
    try {
      const salt = await bcrypt.genSalt();
      return await bcrypt.hash(password, salt);
    } catch (e) {
      console.error(`[ERROR] User.hashPassword: ${e}`);
    }
    return "";
  }

  public static async createUser(
    this: ReturnModelType<typeof User>,
    email: string,
    password: string,
    name: string,
    company: string,
    isAdmin?: boolean,
  ): Promise<UserInfo | undefined> {
    try {
      const exists = await this.findOne({ email: email.toLowerCase() });
      if (exists) {
        throw "User exists";
      }
      const user = await UserModel.create({
        email: email.toLowerCase(),
        password: await this.hashPassword(password),
        name,
        company: company || "",
        isAdmin: isAdmin || false,
        verifyToken: randomBytes(16).toString("hex"),
        lastActivity: new Date(),
      });
      return {
        userId: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        isAdmin: user.isAdmin,
        verifyToken: user.verifyToken,
        lastActivity: user.lastActivity,
      };
    } catch (e) {
      console.error(`[ERROR] User.createUser: ${e}`);
    }
  }

  public async comparePassword(this: DocumentType<User>, password: string) {
    if (this.password) {
      try {
        return await bcrypt.compare(password, this.password);
      } catch (err) {
        console.error("Error comparing passwords: ", err);
      }
    }
    return false;
  }

  public getAuthToken(this: DocumentType<User>, extendAccess = false) {
    const secret = env.JWT_SECRET || "HTv9087rtbjy4234";
    const expiresDays = extendAccess ? 14 : 7;
    const data = {
      user: {
        id: this._id,
        email: this.email,
        name: this.name,
        company: this.company,
        isAdmin: this.isAdmin,
      },
      createdAt: moment().unix(),
      expiresAt: moment().add(expiresDays, "days").unix(),
    };
    return jwt.sign(data, secret);
  }

  public static async login(this: ReturnModelType<typeof User>, email: string, password: string, remember = false) {
    try {
      const user = await this.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw "User not found";
      }

      const validPassword = await user.comparePassword(password);
      if (!validPassword) throw "Invalid Password";

      user.lastActivity = new Date();
      await user.save();

      return user.getAuthToken(remember);
    } catch (e) {
      console.error(`[ERROR] User.login: ${e}`);
    }
    return "";
  }
}

const UserModel = getModelForClass(User);

export { User, UserModel };
