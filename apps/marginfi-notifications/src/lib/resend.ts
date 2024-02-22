// lib/resend.ts
import { Resend } from "resend";
import { env_config } from "../config"; // Adjust the path as necessary
import { accountHealthEmail } from "./emailTemplates"; // Assuming emailTemplates.ts is already created

export async function sendEmailNotification(email: string, health: number): Promise<{ data?: any; error?: any }> {
  const resend = new Resend(env_config.RESEND_API_KEY);

  try {
    const emailHtml = accountHealthEmail(health); // Utilize the email template function
    const { data } = await resend.emails.send({
      from: "onboarding@resend.dev",
      // to: email,
      to: "engineering@mrgn.group",
      subject: "Account Health Notification",
      html: emailHtml,
    });

    return { data };
  } catch (error) {
    console.error(error);
    return { error };
  }
}
