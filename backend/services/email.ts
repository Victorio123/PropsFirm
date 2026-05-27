import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendWelcomeEmail = async (to: string) => {
  try {
    if (!process.env.SMTP_USER) return; // Skip if not configured
    await transporter.sendMail({
      from: `"Prop Firm Platform" <${process.env.SMTP_USER}>`,
      to,
      subject: "Welcome to Prop Firm Platform!",
      text: "Welcome to the trading platform. Your account is created successfully.",
      html: "<b>Welcome to the trading platform.</b> Your account is created successfully."
    });
  } catch (error) {
    console.error("Failed to send welcome email", error);
  }
};

export const sendPaymentConfirmation = async (to: string, amount: number) => {
  try {
    if (!process.env.SMTP_USER) return;
    await transporter.sendMail({
      from: `"Prop Firm Platform" <${process.env.SMTP_USER}>`,
      to,
      subject: "Payment Confirmed - Challenge Activated",
      text: `Your payment of $${amount} was successful. Your trading challenge is now active!`,
      html: `<b>Your payment of $${amount} was successful.</b> Your trading challenge is now active!`
    });
  } catch (error) {
    console.error("Failed to send payment email", error);
  }
};

export const sendAccountStatusUpdate = async (to: string, status: "FAILED" | "FUNDED") => {
  try {
    if (!process.env.SMTP_USER) return;
    const isFunded = status === "FUNDED";
    await transporter.sendMail({
      from: `"Prop Firm Platform" <${process.env.SMTP_USER}>`,
      to,
      subject: `Account Status Update: ${status}`,
      text: isFunded ? "Congratulations! Your account has reached the profit target and is now FUNDED!" : "Unfortunately, your account has breached the drawdown limits and is now FAILED.",
      html: isFunded ? "<b>Congratulations!</b> Your account has reached the profit target and is now FUNDED!" : "<b>Unfortunately,</b> your account has breached the drawdown limits and is now FAILED."
    });
  } catch (error) {
    console.error("Failed to send status update email", error);
  }
};
