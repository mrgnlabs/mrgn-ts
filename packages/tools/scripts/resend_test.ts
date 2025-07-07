import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const toEmail = "";

const sendEmail = async () => {
  const { data, error } = await resend.emails.send({
    from: "Marginfi <noreply@email.marginfi.com>",
    to: [toEmail],
    subject: "Marginfi Test Email",
    html: "<p>This is a test email from Marginfi.</p>",
  });

  if (error) {
    console.error("Error sending email");
    console.error(error);
  } else {
    console.log("Email sent successfully");
    console.log(data);
  }
};

sendEmail();
