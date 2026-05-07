'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

export default function AdminPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    // Load last sync from sessionStorage
    const stored = sessionStorage.getItem('last_sync');
    if (stored) {
      try {
        setLastSync(JSON.parse(stored));
      } catch {}
    }
  }, []);

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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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
      </main>
    </div>
  );
}
