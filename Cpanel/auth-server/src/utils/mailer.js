const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, html }) => {
  try {
    // Create reusable transporter for Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"MSPK™ Apps Support" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    // console.log    console.log(`✅ Mail sent to ${to}: ${info.messageId}`);

    return { success: true, info };
  } catch (error) {
    console.error("❌ Mail sending failed:", error);
    return { success: false, error };
  }
};

module.exports = { sendMail };
