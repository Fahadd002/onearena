/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from "nodemailer";
import ejs from "ejs";
import status from "http-status";
import path from "node:path";
import config from "../../config/index";
import AppError from "../../config/errorHelpers/AppError";

const transporter = nodemailer.createTransport({
    host: config.emailSenderSmtpHost,
    port: Number(config.emailSenderSmtpPort),
    secure: true,
    auth: {
        user: config.emailSenderSmtpUser,
        pass: config.emailSenderSmtpPass
    }
});

interface SendEmailOptions {
    to: string;
    subject: string;
    templateName: string;
    templateData: Record<string, any>;
    attachments?: {
        filename: string;
        content: Buffer;
        contentType?: string;
    }[];
}

export const sendEmail = async ({ subject, templateName, templateData, to, attachments }: SendEmailOptions) => {
    try {
        const tempalatePath = path.resolve(process.cwd(), `src/app/templates/${templateName}.ejs`);
        const html = await ejs.renderFile(tempalatePath, templateData);
        const info = await transporter.sendMail({
            from: config.emailSenderFrom,
            to: to,
            subject: subject,
            html: html,
            attachments: attachments?.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType
            }))
        });
        console.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error: any) {
        throw new AppError(status.INTERNAL_SERVER_ERROR, `Failed to send email: ${error.message}`);
    }
};