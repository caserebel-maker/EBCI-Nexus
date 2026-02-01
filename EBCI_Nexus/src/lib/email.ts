import nodemailer from 'nodemailer';

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if configuration exists
    if (smtpHost && smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });

            // Handle multiple recipients (BCC for privacy in broadcasts)
            const mailOptions = {
                from: `"EBCI Nexus HR" <${smtpUser}>`,
                to: Array.isArray(to) ? undefined : to, // Single recipient
                bcc: Array.isArray(to) ? to : undefined, // List of recipients
                subject,
                html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("Message sent: %s", info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error("Error sending email:", error);
            // Don't throw, return success: false so app doesn't crash
            return { success: false, error };
        }
    } else {
        // Fallback: Log to console (Dry Run / Dev Mode)
        console.log("==========================================");
        console.log("📧 [MOCK EMAIL SERVICE] - No SMTP Configured");
        console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
        console.log(`Subject: ${subject}`);
        console.log("------------------------------------------");
        console.log("Body Preview:");
        console.log(html.substring(0, 200) + "...");
        console.log("==========================================");

        return { success: true, mock: true };
    }
}
