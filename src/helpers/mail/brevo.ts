import { env } from "@/environment";
import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";

import verificationLink from "./templates/verificationLink";
import recoveryLink from "./templates/recoveryLink";

const apiInstance = new TransactionalEmailsApi();
(apiInstance as unknown as { authentications: { apiKey: { apiKey: string } } }).authentications.apiKey.apiKey =
  env.BREVO_API_KEY;

const sendTransactionalEmail = async (to: string, subject: string, htmlContent: string) => {
  const sendSmtpEmail = new SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    name: env.BREVO_FROM_NAME,
    email: env.BREVO_FROM_EMAIL,
  };
  sendSmtpEmail.to = [{ email: to }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error(`[ERROR][sendTransactionalEmail] ${error}`);
    throw error;
  }
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const link = `${env.APP_URL}/verify?email=${to}&token=${token}`;
  if (env.NODE_ENV === "test") return link;

  const html = verificationLink.replaceAll("{{VERIFICATION_LINK}}", link);

  try {
    await sendTransactionalEmail(to, "Verify your Account", html);
  } catch (e) {
    console.error(`[ERROR][sendVerificationEmail] ${e}`);
  }
};

export const sendRecoverEmail = async (to: string, token: string) => {
  const link = `${env.APP_URL}/reset-password?email=${to}&token=${token}`;
  if (env.NODE_ENV === "test") return link;

  const html = recoveryLink.replaceAll("{{RECOVERY_LINK}}", link);

  try {
    await sendTransactionalEmail(to, "Recover your Account", html);
  } catch (e) {
    console.error(`[ERROR][sendRecoverEmail] ${e}`);
  }
};
