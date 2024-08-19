import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "local";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/doteducation";

const SERVER_HOST = process.env.SERVER_HOST || "0.0.0.0";
const SERVER_PORT = parseInt(process.env.SERVER_PORT || "4000");

const APP_URL = process.env.APP_URL || `http://${SERVER_HOST}:3000`;

const JWT_SECRET = process.env.JWT_SECRET || "OR5t0v7yk3z7qw77";

// AWS
const AWS_SES_REGION = process.env.AWS_SES_REGION || "us-east-1";
const AWS_SES_ID = process.env.AWS_SES_ID || "123123123";
const AWS_SES_SECRET = process.env.AWS_SES_SECRET || "123123123";
const AWS_SES_SOURCE = process.env.AWS_SES_SOURCE || "email@polkadot.education";

// DEBUG/TEST
const DEBUG = parseInt(process.env.DEBUG || "0");

export const env = {
  NODE_ENV,
  MONGODB_URI,
  SERVER_HOST,
  SERVER_PORT,
  APP_URL,
  JWT_SECRET,
  AWS_SES_REGION,
  AWS_SES_SECRET,
  AWS_SES_ID,
  AWS_SES_SOURCE,
  DEBUG,
};
