// lib/resend.ts
import { Resend } from "resend";
import { env_config } from "../config"; // Adjust the path as necessary
import { accountHealthEmail } from "./emailTemplates"; // Assuming emailTemplates.ts is already created

export async function sendEmailNotification(email: string, health: number): Promise<{ data?: any; error?: any }> {
  const resend = new Resend(env_config.RESEND_API_KEY);

  try {
    const emailHtml = accountHealthEmail(health); // Utilize the email template function
    const { data } = await resend.emails.send({
      from: "Marginfi Alerts <marginfi@email.marginfi.com>",
      to: email,
      bcc: "engineering@mrgn.group",
      subject: "Marginfi Account Health Alert",
      html: emailHtml,
    });

    return { data };
  } catch (error) {
    console.error(error);
    return { error };
  }
}
