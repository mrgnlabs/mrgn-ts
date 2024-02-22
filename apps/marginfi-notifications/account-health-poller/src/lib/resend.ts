// lib/resend.ts
import { Resend } from "resend";
import { accountHealthEmail } from "./emailTemplates"; // Assuming emailTemplates.ts is already created

export async function sendEmailNotification(email: string, health: number): Promise<{ data?: any; error?: any }> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const emailHtml = accountHealthEmail(health); // Utilize the email template function
    const { data } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Account Health Notification",
      html: emailHtml,
    });

    return { data };
  } catch (error) {
    console.error(error);
    return { error };
  }
}
