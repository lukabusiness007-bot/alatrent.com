import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import { renderEmail } from './templates';
import type { EmailMessage } from './types';

export function emailConfiguration() {
  const enabled = process.env.SES_ENABLED === 'true';
  const region = process.env.SES_REGION || 'eu-north-1';
  const from = 'noreply@alatrent.rs';
  const replyTo = process.env.SES_REPLY_TO || 'office@alatrenta.rs';
  const roleArn = process.env.SES_ROLE_ARN;
  const credentials = !!roleArn || !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  return { enabled, ready: enabled && credentials && /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(replyTo), region, from, replyTo, roleArn };
}

export async function sendSesEmail(message: EmailMessage) {
  const cfg = emailConfiguration();
  if (!cfg.ready) throw Object.assign(new Error('SES configuration missing'), { name: 'ConfigurationError', $metadata: { httpStatusCode: 400 } });
  const client = new SESv2Client({ region: cfg.region, maxAttempts: 1,
    ...(cfg.roleArn ? { credentials: awsCredentialsProvider({ roleArn: cfg.roleArn }) } : {}),
  });
  try {
    const rendered = renderEmail(message.content, cfg.replyTo);
    const sent = await client.send(new SendEmailCommand({
      FromEmailAddress: `Alat Rent <${cfg.from}>`,
      Destination: { ToAddresses: [message.to] },
      ReplyToAddresses: [cfg.replyTo],
      Content: { Simple: { Subject: { Data: rendered.subject, Charset: 'UTF-8' }, Body: {
        Html: { Data: rendered.html, Charset: 'UTF-8' }, Text: { Data: rendered.text, Charset: 'UTF-8' },
      } } },
      EmailTags: [{ Name: 'event', Value: message.content.kind }],
    }), { abortSignal: AbortSignal.timeout(8_000) });
    return sent.MessageId || '';
  } finally { client.destroy(); }
}
