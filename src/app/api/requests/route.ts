import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addRequest, getRequests, deleteRequest } from '@/lib/store';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, description } = body as {
      name?: string;
      email?: string;
      description?: string;
    };

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Поле «Имя» обязательно' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Поле «Описание» обязательно' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: 'Некорректный email' },
          { status: 400 }
        );
      }
    }

    const storedRequest = await addRequest(
      name.trim(),
      email?.trim() || undefined,
      description.trim()
    );

    // Try to send email notification (don't fail if email fails)
    const emailResult = await sendRequestNotification(storedRequest);
    if (!emailResult.success) {
      console.warn('Email notification failed:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Запрос успешно отправлен',
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Request submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обработке запроса' },
      { status: 500 }
    );
  }
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

    const requests = await getRequests();
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Идентификатор запроса обязателен' },
        { status: 400 }
      );
    }

    const deleted = await deleteRequest(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Запрос не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Запрос удалён',
    });
  } catch (error) {
    console.error('Failed to delete request:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении запроса' },
      { status: 500 }
    );
  }
}
