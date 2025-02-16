import { Readable } from 'stream';
import { Url } from 'url';
import { FactoryToken } from '../common-types';

export interface DefaultMailOptions {
    from: string;
    sender?: string;
}

export interface SendTemplateOptions {
    template: string;
    context?: Record<string, any>;
    language?: string;
}

export interface SendMailOptions extends Partial<DefaultMailOptions> {
    to: string;
    subject?: string;
}

export interface CreateMailOptions extends SendMailOptions {
    content: string | SendTemplateOptions;
}

export interface SmtpOptions {
    /** the hostname or IP address to connect to */
    host: string | undefined;
    /** the port to connect to (defaults to 25 or 465) */
    port?: number | undefined;
    /** defines authentication data */
    credentials?: {
        /** the username */
        user: string;
        /** then password */
        pass: string;
    };
    /** defines if the connection should use SSL (if true) or not (if false) */
    secure?: boolean | undefined;
    /** turns off STARTTLS support if true */
    ignoreTLS?: boolean | undefined;
    /** forces the client to use STARTTLS. Returns an error if upgrading the connection is not possible or fails. */
    requireTLS?: boolean | undefined;
    /** tries to use STARTTLS and continues normally if it fails */
    opportunisticTLS?: boolean | undefined;
}

export interface MailAttachment {
    /** String, Buffer or a Stream contents for the attachment */
    content?: string | Buffer | Readable | undefined;
    /** path to a file or a URL (data uris are allowed as well) if you want to stream the file instead of including it (better for larger attachments) */
    path?: string | Url | undefined;
    /** filename to be reported as the name of the attached file, use of unicode is allowed.
     * If you do not want to use a filename, set this value as false, otherwise a filename is generated automatically */
    filename?: string | false | undefined;
    /** If set and content is string, then encodes the content to a Buffer using the specified encoding. Example values: base64, hex, binary etc. Useful if you want to use binary attachments in a JSON formatted e-mail object */
    encoding?: string | undefined;
    /** optional content type for the attachment, if not set will be derived from the filename property */
    contentType?: string | undefined;
    /** optional transfer encoding for the attachment, if not set it will be derived from the contentType property. Example values: quoted-printable, base64. If it is unset then base64 encoding is used for the attachment. If it is set to false then previous default applies (base64 for most, 7bit for text). */
    contentTransferEncoding?: '7bit' | 'base64' | 'quoted-printable' | false | undefined;
    /** optional content disposition type for the attachment, defaults to ‘attachment’ */
    contentDisposition?: 'attachment' | 'inline' | undefined;
}

export interface MailerModuleOpts {
    smtp: SmtpOptions;
    defaultOptions: DefaultMailOptions;
    preview?: boolean;
}

export const SMTP_OPTIONS: FactoryToken<SmtpOptions> = Symbol.for('SMTP_OPTIONS');
export const DEFAULT_MAIL_OPTIONS: FactoryToken<DefaultMailOptions> = Symbol.for('DEFAULT_MAIL_OPTIONS');
export const PREVIEW_MAILS: FactoryToken<boolean> = Symbol.for('PREVIEW_MAILS');
export const MAILER_MODULE_OPTIONS: FactoryToken<MailerModuleOpts> = Symbol.for('MAILER_MODULE_OPTIONS');
