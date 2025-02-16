import { Inject, Injectable, Optional } from '@nestjs/common';
import previewEmail from 'preview-email';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Readable } from 'stream';
import juice from 'juice';

import { copyStream, isString } from '../utils';
import { TemplatesService } from '../templates';

import {
    CreateMailOptions,
    DEFAULT_MAIL_OPTIONS,
    DefaultMailOptions,
    PREVIEW_MAILS,
    SendTemplateOptions,
    SMTP_OPTIONS,
    SmtpOptions,
} from './common';
import { MailTarget } from './mail-target';

@Injectable()
export class MailerService {
    protected transporter: Transporter<SMTPTransport.SentMessageInfo>;

    constructor(
        @Inject(SMTP_OPTIONS) smtp: SmtpOptions,
        @Inject(PREVIEW_MAILS) preview: boolean,
        @Inject(DEFAULT_MAIL_OPTIONS) protected options: DefaultMailOptions,
        @Optional() protected templates: TemplatesService
    ) {
        const auth = !smtp.credentials
            ? undefined
            : { type: 'login', ...smtp.credentials };
        this.transporter = createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            ignoreTLS: smtp.ignoreTLS,
            requireTLS: smtp.requireTLS,
            opportunisticTLS: smtp.opportunisticTLS,
            auth,
        } as SMTPTransport.Options);
        if (preview) {
            this.transporter.use('compile', (mail, callback) => {
                const data = mail.data;
                data.attachments?.forEach((attachment) => {
                    if (attachment.content instanceof Readable) {
                        attachment.content = copyStream(attachment.content);
                    }
                });
                callback();
            });
            this.transporter.use('stream', (mail, callback) => {
                const data = { ...mail.data };
                data.attachments = (data.attachments || []).map(attachment => {
                    attachment = { ...attachment };
                    if (attachment.content instanceof Readable) {
                        attachment.content = copyStream(attachment.content);
                    }
                    return attachment;
                });
                return previewEmail(data)
                    .then(() => callback())
                    .catch(callback);
            });
        }
    }

    create(opts: CreateMailOptions): MailTarget {
        const { content, ...rest } = opts;
        const context = Object.assign(
            {},
            isString(content) ? {} : content.context || {}
        );
        return new MailTarget(
            this.transporter,
            { ...this.options, ...rest },
            context,
            () => this.renderContent(content, context)
        );
    }

    templateAsset(path: string): Readable {
        return this.templates.asset(path);
    }

    protected async renderContent(
        content: string | SendTemplateOptions,
        context: Record<string, any>
    ) {
        const html = juice(
            isString(content)
                ? content
                : await this.templates.render(
                      content.template,
                      content.language,
                      context
                  )
        );
        const pattern = /<body[^>]*>([\s\S]*?)<\/body>/i;
        const match = html.match(pattern);
        return match ? match[1].trim() : html;
    }
}
