import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateMultipleEnvVars, triggerRedeploy, testEmail } from '@/lib/settings';
import { addRequest, getRequests } from '@/lib/store';
import { sendRequestNotification } from '@/lib/email';

const COOKIE_NAME = 'admin_session';

function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  try {
    const decoded = JSON.parse(Buffer.from(cookieValue, 'base64').toString());
    if (decoded.exp && Date.now() > decoded.exp) return false;
    return !!decoded.login;
  } catch {
    return false;
  }
}

function maskValue(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '****' + value.slice(-2);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);

    if (!isAuthenticated(session?.value)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL || '',
        SMTP_HOST: process.env.SMTP_HOST || '',
        SMTP_PORT: process.env.SMTP_PORT || '465',
        SMTP_USER: process.env.SMTP_USER || '',
        SMTP_PASS: process.env.SMTP_PASS ? maskValue(process.env.SMTP_PASS) : '',
        FROM_EMAIL: process.env.FROM_EMAIL || '',
        ADMIN_LOGIN: process.env.ADMIN_LOGIN || '',
      },
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);

    if (!isAuthenticated(session?.value)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body as { action: string };

    // Handle test email
    if (action === 'test_email') {
      const result = await testEmail();
      return NextResponse.json(result);
    }

    // Handle credential change
    if (action === 'update_credentials') {
      const { newLogin, newPassword } = body as {
        newLogin?: string;
        newPassword?: string;
      };

      if (!newLogin || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Логин и пароль обязательны' },
          { status: 400 }
        );
      }

      if (newLogin.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Логин должен быть не менее 3 символов' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Пароль должен быть не менее 6 символов' },
          { status: 400 }
        );
      }

      const result = await updateMultipleEnvVars({
        ADMIN_LOGIN: newLogin,
        ADMIN_PASSWORD: newPassword,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Ошибка обновления' },
          { status: 500 }
        );
      }

      // Trigger redeploy to apply new credentials
      const redeployResult = await triggerRedeploy();
      if (!redeployResult.success) {
        console.warn('Redeploy failed after credential update:', redeployResult.error);
      }

      return NextResponse.json({
        success: true,
        message: 'Данные для входа обновлены. Проект будет переразвёрнут для применения изменений.',
        redeployTriggered: redeployResult.success,
      });
    }

    // Handle SMTP settings update
    const {
      NOTIFICATION_EMAIL,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      FROM_EMAIL,
    } = body as {
      NOTIFICATION_EMAIL?: string;
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASS?: string;
      FROM_EMAIL?: string;
    };

    // Validate email settings
    if (NOTIFICATION_EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(NOTIFICATION_EMAIL)) {
        return NextResponse.json(
          { success: false, error: 'Некорректный email для уведомлений' },
          { status: 400 }
        );
      }
    }

    if (FROM_EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(FROM_EMAIL)) {
        return NextResponse.json(
          { success: false, error: 'Некорректный email отправителя' },
          { status: 400 }
        );
      }
    }

    if (SMTP_PORT) {
      const port = parseInt(SMTP_PORT, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return NextResponse.json(
          { success: false, error: 'Некорректный порт SMTP' },
          { status: 400 }
        );
      }
    }

    // Build vars object with only provided values
    const vars: Record<string, string> = {};
    if (NOTIFICATION_EMAIL !== undefined && NOTIFICATION_EMAIL !== '') vars.NOTIFICATION_EMAIL = NOTIFICATION_EMAIL;
    if (SMTP_HOST !== undefined && SMTP_HOST !== '') vars.SMTP_HOST = SMTP_HOST;
    if (SMTP_PORT !== undefined && SMTP_PORT !== '') vars.SMTP_PORT = SMTP_PORT;
    if (SMTP_USER !== undefined && SMTP_USER !== '') vars.SMTP_USER = SMTP_USER;
    if (SMTP_PASS !== undefined && SMTP_PASS !== '') vars.SMTP_PASS = SMTP_PASS;
    if (FROM_EMAIL !== undefined && FROM_EMAIL !== '') vars.FROM_EMAIL = FROM_EMAIL;

    if (Object.keys(vars).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет данных для обновления' },
        { status: 400 }
      );
    }

    const result = await updateMultipleEnvVars(vars);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Ошибка обновления' },
        { status: 500 }
      );
    }

    // Trigger redeploy to apply new env vars
    const redeployResult = await triggerRedeploy();
    if (!redeployResult.success) {
      console.warn('Redeploy failed after settings update:', redeployResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки сохранены. Проект будет переразвёрнут для применения изменений.',
      redeployTriggered: redeployResult.success,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении настроек' },
      { status: 500 }
    );
  }
}
