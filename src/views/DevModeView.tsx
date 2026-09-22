import React, { useState } from 'react';
import { Terminal, RefreshCw, Trash2, Play, Code2, Database, Copy, Check } from 'lucide-react';
import type { AnimeWithEpisodes, AppSettings, UILanguage } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';
import { openVideoFile } from '../services/player.ts';

interface DevModeViewProps {
  animeList: AnimeWithEpisodes[];
  settings: AppSettings;
  uiLanguage: UILanguage;
  onReseedSample: () => void;
  onClearLibrary: () => void;
}

export const DevModeView: React.FC<DevModeViewProps> = ({
  animeList,
  settings,
  uiLanguage,
  onReseedSample,
  onClearLibrary,
}) => {
  const { t } = useI18n(uiLanguage);
  const [copied, setCopied] = useState(false);
  const [testPath, setTestPath] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const jsonDump = JSON.stringify(
    {
      settings,
      stats: {
        totalAnime: animeList.length,
        totalEpisodes: animeList.reduce((acc, a) => acc + a.totalLocalEpisodes, 0),
        totalWatched: animeList.reduce((acc, a) => acc + a.watchedCount, 0),
      },
      library: animeList,
    },
    null,
    2
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonDump);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPlayer = async () => {
    const target = testPath.trim() || (animeList[0]?.episodes[0]?.filePath ?? 'C:\\test\\sample.mkv');
    setTestResult(`Launching player with target: ${target}`);
    const res = await openVideoFile(target);
    setTestResult(res.success ? 'Player launch signal sent successfully!' : `Error: ${res.error}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 select-none bg-[#121212]">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div className="flex items-center gap-2 text-white mb-1">
            <Terminal size={20} />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {t('devConsoleTitle')}
            </h1>
          </div>
          <p className="text-xs text-[#888888]">
            {t('devConsoleDesc')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="glass-panel p-6 rounded-[14px] space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database size={16} />
            <span>Database & Diagnostics Actions</span>
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onReseedSample}
              className="btn-secondary py-2 px-3.5 text-xs gap-2"
            >
              <RefreshCw size={13} />
              <span>{t('btnReseedSample')}</span>
            </button>

            <button
              onClick={onClearLibrary}
              className="btn-secondary py-2 px-3.5 text-xs gap-2 text-[#E0E0E0] hover:text-white"
            >
              <Trash2 size={13} />
              <span>{t('btnClearLibrary')}</span>
            </button>
          </div>
        </div>

        {/* Player Tester */}
        <div className="glass-panel p-6 rounded-[14px] space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Play size={16} />
            <span>{t('btnTestPlayer')}</span>
          </h2>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                placeholder="Target video path (e.g. C:\Anime\test.mkv)..."
                className="input-dark flex-1 text-xs font-mono py-2"
              />
              <button
                onClick={handleTestPlayer}
                className="btn-primary py-2 px-4 text-xs font-semibold"
              >
                Execute
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-[8px] bg-[#161616] border border-[rgba(255,255,255,0.08)] text-xs font-mono text-[#E0E0E0]">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Raw State JSON Viewer */}
        <div className="glass-panel p-6 rounded-[14px] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Code2 size={16} />
              <span>{t('rawDbJson')}</span>
            </h2>

            <button
              onClick={handleCopyJson}
              className="btn-secondary py-1.5 px-3 text-xs gap-1.5"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-[10px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
            <pre className="text-[11px] font-mono text-[#888888] leading-relaxed select-text whitespace-pre-wrap">
              {jsonDump}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
