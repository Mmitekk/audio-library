import nodemailer from 'nodemailer';
import type { SoundRequest } from './store';

export async function sendRequestNotification(request: SoundRequest): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || '465';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !notificationEmail || !fromEmail) {
    console.warn('SMTP settings not configured. Skipping email notification.');
    return { success: false, error: 'SMTP settings not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const dateStr = new Date(request.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    await transporter.sendMail({
      from: `"Аудиотека" <${fromEmail}>`,
      to: notificationEmail,
      subject: `Новый запрос звука от ${request.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Новый запрос звука</h2>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Имя:</strong> ${escapeHtml(request.name)}</p>
            ${request.email ? `<p><strong>Email:</strong> ${escapeHtml(request.email)}</p>` : ''}
            <p><strong>Дата:</strong> ${dateStr}</p>
          </div>
          <h3 style="color: #555;">Описание:</h3>
          <p style="background: #fff; padding: 12px; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(request.description)}</p>
        </div>
      `,
      text: `Новый запрос звука\n\nИмя: ${request.name}\n${request.email ? `Email: ${request.email}\n` : ''}Дата: ${dateStr}\n\nОписание:\n${request.description}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendFulfilledNotification(request: SoundRequest): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || '465';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    console.warn('SMTP settings not configured. Skipping fulfilled notification.');
    return { success: false, error: 'SMTP settings not configured' };
  }

  if (!request.email) {
    return { success: false, error: 'No email provided for the request' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Аудиотека" <${fromEmail}>`,
      to: request.email,
      subject: 'Ваш запрос выполнен — звук добавлен в библиотеку',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Здравствуйте, ${escapeHtml(request.name)}!</h2>
          <p>Звук, который вы запрашивали, был добавлен в нашу аудиотеку.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Ваш запрос:</strong></p>
            <p style="white-space: pre-wrap;">${escapeHtml(request.description)}</p>
          </div>
          <p>Вы можете найти и прослушать этот звук на нашем сайте: <a href="https://audio-library-three.vercel.app" style="color: #0066cc;">audio-library-three.vercel.app</a></p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Это автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.
          </p>
        </div>
      `,
      text: `Здравствуйте, ${request.name}!\n\nЗвук, который вы запрашивали, был добавлен в нашу аудиотеку.\n\nВаш запрос:\n${request.description}\n\nВы можете найти и прослушать этот звук на нашем сайте: https://audio-library-three.vercel.app\n\nЭто автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.`,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send fulfilled notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
