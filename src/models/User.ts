import { DocumentType, ReturnModelType, getModelForClass, prop } from "@typegoose/typegoose";
import moment from "moment";
import jwt from "jsonwebtoken";
import * as crypto from "crypto";

import { env } from "@/environment";
import BaseModel from "./BaseModel";
import { UserInfo, VerifyUser, RecoverPassword } from "@/types/User";
import { sendVerificationEmail } from "@/helpers/aws/ses";

const SALT_BUFFER = Buffer.from(env.CRYPTO_SALT, "hex");

class User extends BaseModel implements UserInfo {
  public get id(): string {
    return this._id ? this._id.toString() : "";
  }

  @prop({ required: true, unique: true, type: String })
  public email: string;

  @prop({ required: true, type: String })
  public password: string;

  @prop({ required: true, type: String })
  public name: string;

  @prop({ required: false, type: String })
  public picture: string;

  @prop({ required: true, type: String, default: " " })
  public company: string;

  @prop({ required: true, enum: ["english", "portuguese", "spanish"], type: String, default: "english" })
  public language: string;

  @prop({ required: true, type: Boolean, default: false })
  public isAdmin: boolean;

  @prop({ required: false, type: Object })
  public verify?: VerifyUser;

  @prop({ required: false, type: Object })
  public recover?: RecoverPassword;

  @prop({ required: false, type: Date })
  public lastActivity: Date;

  @prop({ required: true, enum: ["Email", "Google", "Web3"], type: String, default: "Email" })
  public signInType: string;

  public static async hashPassword(password: string): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        crypto.scrypt(password, SALT_BUFFER, 32, (err, derivedPassword) => {
          if (err) reject(err);
          resolve(derivedPassword.toString("hex"));
        });
      });
    } catch (e) {
      console.error(`[ERROR] User.hashPassword: ${e}`);
    }
    return "";
  }

  public static async createUser(
    this: ReturnModelType<typeof User>,
    {
      email,
      password,
      name,
      language,
      company,
      picture,
      isAdmin = false,
      signInType,
    }: {
      email: string;
      password: string;
      name: string;
      language: string;
      company: string;
      picture?: string;
      isAdmin?: boolean;
      signInType: "Email" | "Google" | "Web3";
    },
  ): Promise<UserInfo | undefined> {
    try {
      const exists = await this.findOne({ email: email.toLowerCase() });
      if (exists) {
        throw "User exists";
      }

      // We do not need to add verification for users from Google and Web3/Wallet
      let verify;
      if (signInType === "Email") {
        verify = {
          token: crypto.randomBytes(16).toString("hex"),
          date: new Date(),
        };
      }

      const user = await UserModel.create({
        email: email.toLowerCase(),
        password: await this.hashPassword(password || crypto.randomBytes(16).toString("hex")),
        name,
        language,
        company,
        picture,
        isAdmin: isAdmin || false,
        verify,
        lastActivity: new Date(),
        signInType,
      });

      return {
        id: user._id,
        email: user.email,
        name: user.name,
        language: user.language,
        company: user.company,
        picture: user.picture,
        isAdmin: user.isAdmin,
        verify: user.verify,
        lastActivity: user.lastActivity,
      };
    } catch (e) {
      console.error(`[ERROR] User.createUser: ${e}`);
    }
  }

  public async comparePassword(this: DocumentType<User>, password: string) {
    if (this.password) {
      try {
        return new Promise((resolve, reject) => {
          crypto.scrypt(password, SALT_BUFFER, 32, (err, derivedPassword) => {
            if (err) reject(err);
            resolve(this.password == derivedPassword.toString("hex"));
          });
        });
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
        isAdmin: this.isAdmin,
      },
      createdAt: moment().unix(),
      expiresAt: moment().add(expiresDays, "days").unix(),
    };
    return jwt.sign(data, secret);
  }

  public static async login(this: ReturnModelType<typeof User>, email: string, password: string, remember = false) {
    const user = await this.findOne({ email: email.toLowerCase() });
    if (!user) throw "User not found or invalid password";

    const validPassword = await user.comparePassword(password);
    if (!validPassword) throw "User not found or invalid password";

    if (user.verify) {
      const oneDay = new Date();
      oneDay.setDate(oneDay.getDate() - 1);
      // Should we resend a link (after 24h)?
      if (user.verify.date < oneDay) {
        user.verify = {
          token: crypto.randomBytes(16).toString("hex"),
          date: new Date(),
        };
        await user.save();
        await sendVerificationEmail(email, user.verify.token);
      }
      // TODO: For now, we do not force verification while testing.
      if (env.NODE_ENV !== "test") throw "Verify your email";
    }

    user.lastActivity = new Date();
    await user.save();
    return user.getAuthToken(remember);
  }
}

const UserModel = getModelForClass(User);

export { User, UserModel };
