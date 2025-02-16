import { Attachment } from 'nodemailer/lib/mailer';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { randomUUID } from 'crypto';
import { stripTags } from '../utils';
import { MailAttachment, SendMailOptions } from './common';

export class MailTarget {
    protected attachments: Attachment[];

    constructor(
        protected readonly transporter: Transporter<SMTPTransport.SentMessageInfo>,
        protected readonly opts: SendMailOptions,
        protected readonly context: Record<string, any>,
        protected readonly render: () => Promise<string>
    ) {
        this.attachments = [];
    }

    attach(attachment: MailAttachment, contextPath?: string): MailTarget {
        const cid = contextPath ? randomUUID() : undefined;
        this.attachments.push({
            ...attachment,
            cid,
        });
        if (cid) {
            this.context[contextPath] = `cid:${cid}`;
        }
        return this;
    }

    async send() {
        const html = await this.render();
        const text = stripTags(html);
        const message = {
            ...this.opts,
            attachments: this.attachments,
            html,
            text,
        };
        return this.transporter.sendMail(message);
    }
}
