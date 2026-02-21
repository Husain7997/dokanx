const nodemailer = require("nodemailer");

const transporter =
nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.send = async (to, subject, html) => {
  await transporter.sendMail({
    from: "no-reply@dokanx.com",
    to,
    subject,
    html,
  });
};
