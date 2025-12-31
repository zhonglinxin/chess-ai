'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzePosition, explainMove } from '@/app/actions';
import { Loader2, Lightbulb } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnalysisPanelProps {
    fen: string | null;
    requestId: number;
}

export function AnalysisPanel({ fen, requestId }: AnalysisPanelProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [explanation, setExplanation] = useState<string>('');
    const [isExplaining, setIsExplaining] = useState(false);

    useEffect(() => {
        if (!fen || requestId === 0) {
            setExplanation('');
            setIsAnalyzing(false);
            setIsExplaining(false);
            return;
        }

        const runAnalysis = async () => {
            setIsAnalyzing(true);
            setExplanation('');

            const result = await analyzePosition(fen);

            setIsAnalyzing(false);

            if ('error' in result) {
                console.error(result.error);
                setExplanation('无法获取大师点评，请稍后重试。');
                return;
            }

            // Trigger explanation
            setIsExplaining(true);
            try {
                const text = await explainMove(fen, result.lan, result.eval);
                setExplanation(text);
            } catch (err) {
                console.error(err);
                setExplanation('无法获取大师点评，请稍后重试。');
            } finally {
                setIsExplaining(false);
            }
        };

        runAnalysis();
    }, [fen, requestId]);

    const explanationText =
        explanation ||
        (isExplaining ? '正在生成大师点评...' : '暂无点评，请稍后重试。');

    return (
        <div className="w-full">
            {!fen || requestId === 0 ? (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-muted-foreground">
                            <Lightbulb className="w-5 h-5" />
                            暂无大师点评
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        准备好局面后点击“大师点评”，将在这里展示点评内容。
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                            大师点评
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                正在准备大师点评...
                            </div>
                        ) : (
                            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                <div className="prose dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
                                    {explanationText}
                                </div>
                                {isExplaining && (
                                    <Loader2 className="mt-2 h-4 w-4 animate-spin" />
                                )}
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
