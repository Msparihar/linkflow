import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function notifyLogin(email: string) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  try {
    await transporter.sendMail({
      from: `"LinkFlow" <${process.env.SMTP_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `Login: ${email}`,
      text: `User ${email} logged in at ${time} (IST)`,
      html: `<p><strong>${email}</strong> logged in at <strong>${time}</strong> (IST)</p>`,
    })
  } catch (err) {
    console.error("Failed to send login notification email:", err)
  }
}

export async function notifyRegister(email: string) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  try {
    await transporter.sendMail({
      from: `"LinkFlow" <${process.env.SMTP_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Registration: ${email}`,
      text: `New user ${email} registered at ${time} (IST)`,
      html: `<p>New user <strong>${email}</strong> registered at <strong>${time}</strong> (IST)</p>`,
    })
  } catch (err) {
    console.error("Failed to send registration notification email:", err)
  }
}
