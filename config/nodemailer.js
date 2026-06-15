import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.ethereal.email";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter = null;

const createTransporter = async () => {
  if (transporter) return transporter;

  // If credentials are fully available, use them
  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    return transporter;
  }

  // Otherwise, use a simulated ethereal mail setup or console Logger
  try {
    console.log("No SMTP credentials. Initializing Ethereal sandbox test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return transporter;
  } catch (error) {
    console.warn("Failed to create Ethereal sandbox mail. Falling back to log-only transporter:", error);
    transporter = {
      sendMail: async (mailOptions) => {
        console.log("=== SIMULATED EMAIL SENT ===");
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Body (Text): ${mailOptions.text}`);
        console.log("============================");
        return { messageId: "simulated_id" };
      },
    };
    return transporter;
  }
};

export const sendMail = async ({ to, subject, html, text }) => {
  const currentTransporter = await createTransporter();
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Abaya By Tabassum'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@tabassum.com'}>`,
    to,
    subject,
    text: text || "Abaya By Tabassum notification",
    html,
  };

  try {
    const info = await currentTransporter.sendMail(mailOptions);
    console.log(`Message sent: ${info.messageId}`);
    // If using ethereal test account, log URL to view the message
    if (nodemailer.getTestMessageUrl && typeof nodemailer.getTestMessageUrl === "function") {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log(`Preview URL: ${url}`);
    }
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
