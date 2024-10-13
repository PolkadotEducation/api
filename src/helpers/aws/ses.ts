import { env } from "@/environment";

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import verificationLink from "./templates/verificationLink";
import recoveryLink from "./templates/recoveryLink";

const sesClient = new SESClient({
  credentials: {
    secretAccessKey: String(env.AWS_SES_SECRET),
    accessKeyId: String(env.AWS_SES_ID),
  },
  apiVersion: "2010-12-01",
  region: String(env.AWS_SES_REGION),
});

const createSendEmailCommand = (
  toAddresses: string[],
  subject: string,
  html: string,
  fromAddress: string = env.AWS_SES_SOURCE,
) => {
  const from = `Polkadot Education <${fromAddress}>`;
  return new SendEmailCommand({
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: from,
  });
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const link = `${env.APP_URL}/verify?email=${to}&token=${token}`;
  if (env.NODE_ENV === "test") return link;
  const html = verificationLink.replaceAll("{{VERIFICATION_LINK}}", link);
  const sendEmailCommand = createSendEmailCommand([to], "Verify your Account", html);
  try {
    await sesClient.send(sendEmailCommand);
  } catch (e) {
    console.error(`[ERROR][sendVerificationEmail] ${e}`);
  }
};

export const sendRecoverEmail = async (to: string, token: string) => {
  const link = `${env.APP_URL}/reset-password?email=${to}&token=${token}`;
  if (env.NODE_ENV === "test") return link;
  const html = recoveryLink.replaceAll("{{RECOVERY_LINK}}", link);
  const sendEmailCommand = createSendEmailCommand([to], "Recover your Account", html);
  try {
    await sesClient.send(sendEmailCommand);
  } catch (e) {
    console.error(`[ERROR][sendRecoverEmail] ${e}`);
  }
};
