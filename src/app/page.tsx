'use client';

import { useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { AnalysisPanel } from '@/components/analysis-panel';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw } from 'lucide-react';
import { recognizeChessboard } from './actions';
import { useHistory } from '@/hooks/use-history';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [fen, setFen] = useState<string | null>(null);
  const { history, saveToHistory } = useHistory();

  const handleImageSelected = (file: File) => {
    setSelectedImage(file);
    setFen(null);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setFen(null);
  };

  const loadFromHistory = (historyFen: string) => {
    setFen(historyFen);
    setSelectedImage(null);
  };

  const startRecognition = async () => {
    if (!selectedImage) return;

    setIsRecognizing(true);
    setFen(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const result = await recognizeChessboard(formData);

      if (result.error) {
        alert(result.error);
      } else if (result.fen) {
        setFen(result.fen);
        saveToHistory(result.fen);
      }
    } catch (error) {
      console.error(error);
      alert("识别失败，请重试");
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 font-sans">
      <header className="mb-8 text-center pt-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-zinc-900 dark:text-zinc-50">
          AI 国际象棋助手
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          拍照识别棋局，获取大师级分析
        </p>
      </header>

      <main className="max-w-md mx-auto space-y-8">
        {!fen ? (
          <section className="space-y-6">
            <ImageUpload
              onImageSelected={handleImageSelected}
              isAnalyzing={isRecognizing}
            />

            {selectedImage && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={startRecognition}
                  disabled={isRecognizing}
                  className="w-full max-w-xs"
                >
                  {isRecognizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在识别棋局...
                    </>
                  ) : (
                    "开始分析"
                  )}
                </Button>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-zinc-500 mb-4">历史记录</h3>
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadFromHistory(item.fen)}
                      className="p-3 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex justify-between items-center"
                    >
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
                        {item.fen}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: zhCN })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                <RefreshCcw className="w-4 h-4 mr-1" />
                重新拍摄
              </Button>
            </div>

            <AnalysisPanel fen={fen} />
          </section>
        )}
      </main>
    </div>
  );
}
