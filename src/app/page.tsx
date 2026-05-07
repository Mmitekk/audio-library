'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Play,
  Pause,
  Download,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  FileAudio,
  Loader2,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Archive,
  Music,
  AlertCircle,
  X,
  Clock,
} from 'lucide-react';
import { stemMatch } from '@/lib/stemmer';

// Types
interface AudioFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

interface AudioFolder {
  id: string;
  name: string;
  children: (AudioFile | AudioFolder)[];
}

interface ApiError {
  error: string;
}

function isFolder(item: AudioFile | AudioFolder): item is AudioFolder {
  return 'children' in item;
}

function formatFileSize(bytes?: string): string {
  if (!bytes) return '';
  const size = parseInt(bytes, 10);
  if (isNaN(size)) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

// Collect all files from a folder recursively
function collectAllFiles(folder: AudioFolder): AudioFile[] {
  const result: AudioFile[] = [];
  for (const child of folder.children) {
    if (isFolder(child)) {
      result.push(...collectAllFiles(child));
    } else {
      result.push(child);
    }
  }
  return result;
}

// Count files in folder
function countFiles(folder: AudioFolder): number {
  let count = 0;
  for (const child of folder.children) {
    if (isFolder(child)) {
      count += countFiles(child);
    } else {
      count++;
    }
  }
  return count;
}

// Check if folder or any of its children match the search query
function folderMatches(folder: AudioFolder, query: string): boolean {
  if (stemMatch(query, folder.name)) return true;
  for (const child of folder.children) {
    if (isFolder(child)) {
      if (folderMatches(child, query)) return true;
    } else {
      if (stemMatch(query, child.name)) return true;
    }
  }
  return false;
}

// Find the folder path for a file (for breadcrumb/context)
function getFolderFiles(folder: AudioFolder): AudioFile[] {
  return folder.children.filter((c): c is AudioFile => !isFolder(c));
}

// Audio Player Component
function AudioPlayer({
  currentFile,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  volume,
  onVolumeChange,
  progress,
  currentTime,
  duration,
  onSeek,
  onMute,
  isMuted,
}: {
  currentFile: AudioFile | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
  onMute: () => void;
  isMuted: boolean;
}) {
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      onSeek(pct * duration);
    },
    [duration, onSeek]
  );

  if (!currentFile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="w-full h-1.5 bg-secondary rounded-full cursor-pointer mb-3 group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full relative transition-all duration-100"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onPrev}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onPlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {stripExtension(currentFile.name)}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
              {currentFile.size && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(currentFile.size)}</span>
                </>
              )}
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1 accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Folder Item Component
function FolderItem({
  folder,
  searchQuery,
  expandedFolders,
  toggleFolder,
  onPlay,
  currentPlayingId,
  isPlaying,
  onDownloadFile,
  onDownloadFolderZip,
  depth = 0,
}: {
  folder: AudioFolder;
  searchQuery: string;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onPlay: (file: AudioFile) => void;
  currentPlayingId: string | null;
  isPlaying: boolean;
  onDownloadFile: (file: AudioFile) => void;
  onDownloadFolderZip: (folder: AudioFolder) => void;
  depth?: number;
}) {
  const isExpanded = expandedFolders.has(folder.id);
  const files = getFolderFiles(folder);
  const subFolders = folder.children.filter(isFolder);
  const fileCount = countFiles(folder);
  const isSearchActive = searchQuery.trim().length > 0;

  // Filter children based on search
  const filteredChildren = useMemo(() => {
    if (!isSearchActive) return folder.children;
    return folder.children.filter((child) => {
      if (isFolder(child)) {
        return folderMatches(child, searchQuery);
      }
      return stemMatch(searchQuery, child.name);
    });
  }, [folder.children, searchQuery, isSearchActive]);

  const filteredSubFolders = filteredChildren.filter(isFolder);
  const filteredFiles = filteredChildren.filter((c): c is AudioFile => !isFolder(c));

  // During search, auto-expand folders that have matches
  const shouldAutoExpand = isSearchActive && folderMatches(folder, searchQuery);

  if (isSearchActive && filteredChildren.length === 0) return null;

  const showContent = isExpanded || shouldAutoExpand;

  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 16}px` : '0' }}>
      {/* Folder header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group hover:bg-accent/50 ${
          showContent ? 'bg-accent/30' : ''
        }`}
        onClick={() => toggleFolder(folder.id)}
      >
        {showContent ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        {showContent ? (
          <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        <span className={`text-sm font-medium flex-1 ${depth === 0 ? 'text-foreground' : 'text-foreground/90'}`}>
          {folder.name}
        </span>

        <span className="text-xs text-muted-foreground flex-shrink-0">
          {fileCount} {fileCount === 1 ? 'файл' : fileCount < 5 ? 'файла' : 'файлов'}
        </span>

        {/* Download ZIP button for folder */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onDownloadFolderZip(folder);
          }}
          title="Скачать папку ZIP"
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      {showContent && (
        <div className="folder-content">
          {/* Subfolders */}
          {filteredSubFolders.map((sub) => (
            <FolderItem
              key={sub.id}
              folder={sub as AudioFolder}
              searchQuery={searchQuery}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onPlay={onPlay}
              currentPlayingId={currentPlayingId}
              isPlaying={isPlaying}
              onDownloadFile={onDownloadFile}
              onDownloadFolderZip={onDownloadFolderZip}
              depth={depth + 1}
            />
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ml-4 group transition-colors ${
                currentPlayingId === file.id
                  ? 'bg-primary/15 border border-primary/30'
                  : 'hover:bg-accent/30'
              }`}
            >
              <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />

              <span
                className={`text-sm flex-1 min-w-0 truncate ${
                  currentPlayingId === file.id ? 'text-primary font-medium' : 'text-foreground/80'
                }`}
              >
                {stripExtension(file.name)}
              </span>

              {file.size && (
                <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                  {formatFileSize(file.size)}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 flex-shrink-0 transition-all ${
                  currentPlayingId === file.id
                    ? 'text-primary'
                    : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary'
                }`}
                onClick={() => onPlay(file)}
              >
                {currentPlayingId === file.id && isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                onClick={() => onDownloadFile(file)}
                title="Скачать файл"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<AudioFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<AudioFile[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  // Download state
  const [downloadingZip, setDownloadingZip] = useState<string | null>(null);

  // Fetch folder structure
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/gdrive/list');
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load audio library');
        }
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Create audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener('ended', () => {
        // Auto-advance to next track
        if (playbackQueue.length > 0) {
          const nextIdx = queueIndex + 1;
          if (nextIdx < playbackQueue.length) {
            playFile(playbackQueue[nextIdx], playbackQueue, nextIdx);
          } else {
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(false);
        }
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const playFile = useCallback(
    (file: AudioFile, queue: AudioFile[] = [], index = 0) => {
      if (!audioRef.current) return;

      setCurrentFile(file);
      setPlaybackQueue(queue);
      setQueueIndex(index);
      setIsPlayerVisible(true);

      const audioUrl = `/api/gdrive/stream?fileId=${encodeURIComponent(file.id)}`;
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Autoplay failed:', err);
        setIsPlaying(false);
      });
    },
    []
  );

  const handlePlay = useCallback(
    (file: AudioFile) => {
      if (currentFile?.id === file.id && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
        return;
      }

      // Find which folder contains this file and get siblings for queue
      if (data) {
        const queue = collectAllFiles(data);
        const idx = queue.findIndex((f) => f.id === file.id);
        playFile(file, queue, idx);
      } else {
        playFile(file);
      }
    },
    [currentFile, isPlaying, data, playFile]
  );

  const handleNext = useCallback(() => {
    if (playbackQueue.length > 0) {
      const nextIdx = (queueIndex + 1) % playbackQueue.length;
      playFile(playbackQueue[nextIdx], playbackQueue, nextIdx);
    }
  }, [playbackQueue, queueIndex, playFile]);

  const handlePrev = useCallback(() => {
    if (playbackQueue.length > 0) {
      const prevIdx = queueIndex > 0 ? queueIndex - 1 : playbackQueue.length - 1;
      playFile(playbackQueue[prevIdx], playbackQueue, prevIdx);
    }
  }, [playbackQueue, queueIndex, playFile]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
    if (v > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

  const handleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  }, [isMuted, volume]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Accordion behavior: close all others at the same level
        // We keep siblings open but we close the current if toggled
        next.add(id);
      }
      return next;
    });
  }, []);

  // Search handling
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      // When search is cleared, collapse all
      if (!value.trim()) {
        setExpandedFolders(new Set());
      }
      // When search is active, matching folders will auto-expand via shouldAutoExpand
    }, 100);
  }, []);

  const handleDownloadFile = useCallback((file: AudioFile) => {
    const url = `/api/gdrive/download?fileId=${encodeURIComponent(file.id)}&filename=${encodeURIComponent(file.name)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadFolderZip = useCallback(async (folder: AudioFolder) => {
    const files = collectAllFiles(folder);
    if (files.length === 0) return;

    setDownloadingZip(folder.id);
    try {
      const res = await fetch('/api/gdrive/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files.map((f) => ({ id: f.id, name: f.name })) }),
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `audioteka_${folder.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP download error:', err);
      alert('Ошибка при создании ZIP-архива');
    } finally {
      setDownloadingZip(null);
    }
  }, []);

  // Compute progress
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Filter top-level categories based on search
  const filteredCategories = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.children;
    return data.children.filter((child) => {
      if (isFolder(child)) {
        return folderMatches(child, searchQuery);
      }
      return stemMatch(searchQuery, child.name);
    });
  }, [data, searchQuery]);

  const totalFiles = data ? countFiles(data) : 0;
  const totalFolders = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    for (const child of data.children) {
      if (isFolder(child)) count++;
    }
    return count;
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary/15 p-2 rounded-lg">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Аудиотека</h1>
              <p className="text-xs text-muted-foreground">
                Библиотека звуковых эффектов
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названиям файлов и категорий..."
              className="pl-10 pr-10 bg-secondary/50 border-border focus:border-primary"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => handleSearchChange('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Stats */}
          {data && !loading && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                {totalFolders} {totalFolders === 1 ? 'категория' : totalFolders < 5 ? 'категории' : 'категорий'}
              </span>
              <span className="flex items-center gap-1">
                <FileAudio className="h-3 w-3" />
                {totalFiles} {totalFiles === 1 ? 'файл' : totalFiles < 5 ? 'файла' : 'файлов'}
              </span>
              {searchQuery && (
                <span className="text-primary">
                  Найдено: {filteredCategories.length}{' '}
                  {filteredCategories.length === 1 ? 'категория' : filteredCategories.length < 5 ? 'категории' : 'категорий'}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24">
        {/* Loading state */}
        {loading && (
          <div className="space-y-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="ml-4 space-y-1.5">
                  <Skeleton className="h-8 w-3/4 rounded-lg" />
                  <Skeleton className="h-8 w-2/3 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Ошибка загрузки</h2>
            <p className="text-muted-foreground text-sm max-w-md">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data && filteredCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {searchQuery ? 'Ничего не найдено' : 'Библиотека пуста'}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {searchQuery
                ? `По запросу «${searchQuery}» ничего не найдено. Попробуйте другие слова.`
                : 'Аудиофайлы пока не загружены.'}
            </p>
          </div>
        )}

        {/* Folder tree */}
        {!loading && !error && data && filteredCategories.length > 0 && (
          <div className="space-y-1 mt-2">
            {filteredCategories.map((category) =>
              isFolder(category) ? (
                <FolderItem
                  key={category.id}
                  folder={category}
                  searchQuery={searchQuery}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                  onPlay={handlePlay}
                  currentPlayingId={currentFile?.id || null}
                  isPlaying={isPlaying}
                  onDownloadFile={handleDownloadFile}
                  onDownloadFolderZip={handleDownloadFolderZip}
                />
              ) : (
                // Top-level files (rare but possible)
                <div
                  key={category.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg group transition-colors ${
                    currentFile?.id === category.id
                      ? 'bg-primary/15 border border-primary/30'
                      : 'hover:bg-accent/30'
                  }`}
                >
                  <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span
                    className={`text-sm flex-1 min-w-0 truncate ${
                      currentFile?.id === category.id
                        ? 'text-primary font-medium'
                        : 'text-foreground/80'
                    }`}
                  >
                    {stripExtension(category.name)}
                  </span>
                  {category.size && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatFileSize(category.size)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 flex-shrink-0 ${
                      currentFile?.id === category.id
                        ? 'text-primary'
                        : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary'
                    }`}
                    onClick={() => handlePlay(category)}
                  >
                    {currentFile?.id === category.id && isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                    onClick={() => handleDownloadFile(category)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Audio Player */}
      {isPlayerVisible && currentFile && (
        <AudioPlayer
          currentFile={currentFile}
          isPlaying={isPlaying}
          onPlayPause={() => {
            if (!audioRef.current) return;
            if (isPlaying) {
              audioRef.current.pause();
              setIsPlaying(false);
            } else {
              audioRef.current.play().catch(() => {});
              setIsPlaying(true);
            }
          }}
          onNext={handleNext}
          onPrev={handlePrev}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onMute={handleMute}
          isMuted={isMuted}
        />
      )}

      {/* Download ZIP overlay */}
      {downloadingZip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 shadow-2xl border border-border max-w-sm w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-medium">Создание ZIP-архива</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Пожалуйста, подождите. Файлы загружаются и архивируются...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>Аудиотека © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
