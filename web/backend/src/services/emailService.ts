import nodemailer from "nodemailer";

interface SendVerificationEmailOptions {
  to: string;
  name: string;
  token: string;
}

export const sendVerificationEmail = async ({ to, name, token }: SendVerificationEmailOptions): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"CardioWave" <${process.env.SMTP_EMAIL}>`,
      to,
      subject: "Vérifiez votre adresse email - CardioWave",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9fbfd;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a5fc8; margin: 0;">CardioWave</h1>
            <p style="color: #6b7a99; font-size: 16px;">La plateforme d'analyse ECG intelligente</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #1a1e2e; margin-top: 0;">Bonjour ${name},</h2>
            <p style="color: #4a556e; font-size: 15px; line-height: 1.6;">
              Merci d'avoir rejoint CardioWave. Pour finaliser la création de votre compte et assurer la sécurité de vos données, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #1a5fc8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                Vérifier mon email
              </a>
            </div>
            
            <p style="color: #4a556e; font-size: 15px; line-height: 1.6;">
              Si le bouton ne fonctionne pas, copiez-collez le lien suivant dans votre navigateur :<br>
              <a href="${verificationLink}" style="color: #1a5fc8; word-break: break-all;">${verificationLink}</a>
            </p>
            
            <p style="color: #8899bb; font-size: 13px; margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
              Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte CardioWave, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Impossible d'envoyer l'email de vérification");
  }
};
