'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FolderOpen,
  FileAudio,
  Clock,
  ArrowLeft,
  Mail,
  Settings,
  User,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Check,
  Trash2,
} from 'lucide-react';

interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  stats: {
    files: number;
    folders: number;
  };
}

interface SoundRequest {
  id: string;
  name: string;
  email?: string;
  description: string;
  createdAt: string;
  fulfilled: boolean;
  fulfilledAt?: string;
}

interface AdminSettings {
  NOTIFICATION_EMAIL: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  FROM_EMAIL: string;
  ADMIN_LOGIN: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Credentials state
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [credentialsMessage, setCredentialsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Requests state
  const [requests, setRequests] = useState<SoundRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Test email state
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SMTP password (separate from settings to avoid sending masked value)
  const [smtpPass, setSmtpPass] = useState('');

  useEffect(() => {
    // Load last sync from sessionStorage
    const stored = sessionStorage.getItem('last_sync');
    if (stored) {
      try {
        setLastSync(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadRequests();
  }, []);

  async function loadSettings() {
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function loadRequests() {
    try {
      setRequestsLoading(true);
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch('/api/gdrive/sync', { method: 'POST' });
      const data: SyncResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      setLastSync(data);
      sessionStorage.setItem('last_sync', JSON.stringify(data));
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      router.push('/admin/login');
      router.refresh();
    } catch {}
  }

  async function handleSaveSettings() {
    if (!settings) return;
    setSettingsSaving(true);
    setSettingsMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NOTIFICATION_EMAIL: settings.NOTIFICATION_EMAIL,
          SMTP_HOST: settings.SMTP_HOST,
          SMTP_PORT: settings.SMTP_PORT,
          SMTP_USER: settings.SMTP_USER,
          SMTP_PASS: smtpPass,
          FROM_EMAIL: settings.FROM_EMAIL,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка сохранения');
      }

      setSettingsMessage({
        type: 'success',
        text: data.message || 'Настройки сохранены',
      });
    } catch (err) {
      setSettingsMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Произошла ошибка',
      });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestEmailSending(true);
    setTestEmailMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_email' }),
      });

      const data = await res.json();

      if (data.success) {
        setTestEmailMessage({ type: 'success', text: 'Тестовое письмо отправлено успешно!' });
      } else {
        setTestEmailMessage({ type: 'error', text: data.error || 'Ошибка отправки' });
      }
    } catch (err) {
      setTestEmailMessage({ type: 'error', text: 'Произошла ошибка' });
    } finally {
      setTestEmailSending(false);
    }
  }

  async function handleSaveCredentials() {
    setCredentialsMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setCredentialsMessage({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setCredentialsMessage({ type: 'error', text: 'Пароль должен быть не менее 6 символов' });
      return;
    }

    if (newLogin && newLogin.length < 3) {
      setCredentialsMessage({ type: 'error', text: 'Логин должен быть не менее 3 символов' });
      return;
    }

    if (!newLogin && !newPassword) {
      setCredentialsMessage({ type: 'error', text: 'Введите новые данные' });
      return;
    }

    setCredentialsSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_credentials',
          newLogin: newLogin || settings?.ADMIN_LOGIN,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка обновления');
      }

      setCredentialsMessage({
        type: 'success',
        text: data.message || 'Данные для входа обновлены',
      });
      setNewLogin('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setCredentialsMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Произошла ошибка',
      });
    } finally {
      setCredentialsSaving(false);
    }
  }

  async function handleFulfillRequest(requestId: string) {
    setFulfillingId(requestId);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify_fulfilled', requestId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Ошибка при обработке запроса');
        return;
      }
      // Update the local state with fulfilledAt
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, fulfilled: true, fulfilledAt: new Date().toISOString() } : r))
      );
      if (data.emailError) {
        alert('Звук отмечен как добавленный, но не удалось отправить email: ' + data.emailError);
      }
    } catch {
      alert('Произошла ошибка при обработке запроса');
    } finally {
      setFulfillingId(null);
    }
  }

  async function handleDeleteRequest(requestId: string) {
    if (!confirm('Удалить эту заявку?')) return;
    setDeletingId(requestId);
    try {
      const res = await fetch('/api/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Ошибка при удалении');
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      alert('Произошла ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 p-2 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Панель администратора</h1>
                <p className="text-xs text-muted-foreground">Управление аудиотекой</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                На сайт
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="sync" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Синхронизация</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Запросы</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== Sync Tab ===== */}
          <TabsContent value="sync" className="space-y-6">
            {/* Sync Card */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Синхронизация с Google Drive
                </CardTitle>
                <CardDescription>
                  Загрузите актуальную структуру файлов из Google Drive. Данные будут обновлены на сайте.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Синхронизация...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Синхронизировать
                    </>
                  )}
                </Button>

                {syncError && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{syncError}</span>
                  </div>
                )}

                {lastSync && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Последняя синхронизация</span>
                        <Badge variant="secondary" className="ml-auto">
                          {lastSync.success ? 'Успешно' : 'Ошибка'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(lastSync.timestamp).toLocaleString('ru-RU')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FolderOpen className="h-4 w-4" />
                          <span>{lastSync.stats.folders} папок</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileAudio className="h-4 w-4" />
                          <span>{lastSync.stats.files} файлов</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Информация</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <FolderOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Корневая папка Google Drive содержит все аудиофайлы, организованные по категориям.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileAudio className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Поддерживаемые форматы: MP3, WAV, OGG, FLAC, AAC, M4A, WMA, WebM.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Кэш данных обновляется автоматически каждые 5 минут. Используйте кнопку синхронизации для немедленного обновления.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Settings Tab ===== */}
          <TabsContent value="settings" className="space-y-6">
            {/* Email Notification Settings */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  Уведомления по email
                </CardTitle>
                <CardDescription>
                  Настройте SMTP-сервер для получения уведомлений о новых запросах звуков.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : settings ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="notification-email">Email для уведомлений</Label>
                        <Input
                          id="notification-email"
                          type="email"
                          placeholder="admin@example.com"
                          value={settings.NOTIFICATION_EMAIL}
                          onChange={(e) =>
                            setSettings((prev) => prev ? { ...prev, NOTIFICATION_EMAIL: e.target.value } : prev)
                          }
                          className="bg-secondary/50 border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="from-email">Email отправителя</Label>
                        <Input
                          id="from-email"
                          type="email"
                          placeholder="noreply@example.com"
                          value={settings.FROM_EMAIL}
                          onChange={(e) =>
                            setSettings((prev) => prev ? { ...prev, FROM_EMAIL: e.target.value } : prev)
                          }
                          className="bg-secondary/50 border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-host">SMTP-сервер</Label>
                        <Input
                          id="smtp-host"
                          placeholder="smtp.yandex.ru"
                          value={settings.SMTP_HOST}
                          onChange={(e) =>
                            setSettings((prev) => prev ? { ...prev, SMTP_HOST: e.target.value } : prev)
                          }
                          className="bg-secondary/50 border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-port">SMTP-порт</Label>
                        <Input
                          id="smtp-port"
                          placeholder="465"
                          value={settings.SMTP_PORT}
                          onChange={(e) =>
                            setSettings((prev) => prev ? { ...prev, SMTP_PORT: e.target.value } : prev)
                          }
                          className="bg-secondary/50 border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-user">SMTP-пользователь</Label>
                        <Input
                          id="smtp-user"
                          placeholder="user@yandex.ru"
                          value={settings.SMTP_USER}
                          onChange={(e) =>
                            setSettings((prev) => prev ? { ...prev, SMTP_USER: e.target.value } : prev)
                          }
                          className="bg-secondary/50 border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-pass">SMTP-пароль</Label>
                        <Input
                          id="smtp-pass"
                          type="password"
                          placeholder="Оставьте пустым, если не меняете"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="bg-secondary/50 border-border"
                        />
                        <p className="text-xs text-muted-foreground">
                          Текущий пароль: {settings.SMTP_PASS || 'не задан'}
                        </p>
                      </div>
                    </div>

                    {settingsMessage && (
                      <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                        settingsMessage.type === 'success'
                          ? 'text-green-500 bg-green-500/10'
                          : 'text-destructive bg-destructive/10'
                      }`}>
                        {settingsMessage.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>{settingsMessage.text}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={settingsSaving}
                        className="gap-2"
                      >
                        {settingsSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Сохранить настройки
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleTestEmail}
                        disabled={testEmailSending}
                        className="gap-2"
                      >
                        {testEmailSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Тестовое письмо
                      </Button>
                    </div>

                    {testEmailMessage && (
                      <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                        testEmailMessage.type === 'success'
                          ? 'text-green-500 bg-green-500/10'
                          : 'text-destructive bg-destructive/10'
                      }`}>
                        {testEmailMessage.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>{testEmailMessage.text}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Не удалось загрузить настройки.</p>
                )}
              </CardContent>
            </Card>

            {/* Login/Password Settings */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Данные для входа
                </CardTitle>
                <CardDescription>
                  Измените логин и пароль для доступа к панели администратора.
                  После сохранения проект будет переразвёрнут.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : settings ? (
                  <>
                    <div className="space-y-2">
                      <Label>Текущий логин</Label>
                      <Input
                        value={settings.ADMIN_LOGIN}
                        disabled
                        className="bg-secondary/50 border-border opacity-60"
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-login">Новый логин</Label>
                        <Input
                          id="new-login"
                          placeholder="Минимум 3 символа"
                          value={newLogin}
                          onChange={(e) => setNewLogin(e.target.value)}
                          className="bg-secondary/50 border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">Новый пароль</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Минимум 6 символов"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-secondary/50 border-border pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Повторите новый пароль"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-secondary/50 border-border"
                      />
                    </div>

                    {credentialsMessage && (
                      <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                        credentialsMessage.type === 'success'
                          ? 'text-green-500 bg-green-500/10'
                          : 'text-destructive bg-destructive/10'
                      }`}>
                        {credentialsMessage.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>{credentialsMessage.text}</span>
                      </div>
                    )}

                    <Button
                      onClick={handleSaveCredentials}
                      disabled={credentialsSaving}
                      className="gap-2"
                    >
                      {credentialsSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Сохранить данные
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Не удалось загрузить настройки.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Requests Tab ===== */}
          <TabsContent value="requests" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Запросы звуков
                    </CardTitle>
                    <CardDescription>
                      Список заявок от пользователей на добавление новых звуков.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadRequests}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Обновить
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-muted p-3 rounded-full mb-3">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Запросов пока нет.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          request.fulfilled
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-border bg-secondary/30 hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{request.name}</span>
                            {request.email && (
                              <Badge variant="outline" className="text-xs font-normal">
                                <Mail className="h-3 w-3 mr-1" />
                                {request.email}
                              </Badge>
                            )}
                            {request.fulfilled && (
                              <Badge className="text-xs bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/20">
                                <Check className="h-3 w-3 mr-1" />
                                Обработано
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                            disabled={deletingId === request.id}
                            onClick={() => handleDeleteRequest(request.id)}
                            title="Удалить заявку"
                          >
                            {deletingId === request.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(request.createdAt)}
                          </div>
                          {request.fulfilled && request.fulfilledAt && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Обработано: {formatDate(request.fulfilledAt)}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.description}
                        </p>
                        {!request.fulfilled && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-xs"
                              disabled={fulfillingId === request.id || deletingId === request.id}
                              onClick={() => handleFulfillRequest(request.id)}
                            >
                              {fulfillingId === request.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Обработка...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Звук добавлен
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
