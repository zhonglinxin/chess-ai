'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzePosition, StockfishResponse } from '@/app/actions';
import { Loader2, Target } from 'lucide-react';

interface BestMovePanelProps {
    fen: string | null;
    requestId: number;
}

export function BestMovePanel({ fen, requestId }: BestMovePanelProps) {
    const [analysis, setAnalysis] = useState<StockfishResponse | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (!fen || requestId === 0) {
            setAnalysis(null);
            setIsAnalyzing(false);
            return;
        }

        const runAnalysis = async () => {
            setIsAnalyzing(true);
            setAnalysis(null);

            const result = await analyzePosition(fen);

            setIsAnalyzing(false);

            if ('error' in result) {
                console.error(result.error);
                return;
            }

            setAnalysis(result);
        };

        runAnalysis();
    }, [fen, requestId]);

    return (
        <div className="w-full">
            {!fen || requestId === 0 ? (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-muted-foreground">
                            <Target className="w-5 h-5" />
                            暂无最佳走法
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        准备好局面后点击“最佳走法”，将在这里展示引擎推荐。
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-emerald-500" />
                            最佳走法
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                正在计算最佳走法...
                            </div>
                        ) : analysis ? (
                            <div className="text-center w-full">
                                <div className="mb-2 rounded bg-slate-100 p-2 dark:bg-slate-800">
                                    <span className="mr-2 font-bold">最佳走法:</span>
                                    <span className="font-mono text-lg text-blue-600">
                                        {analysis.san || analysis.lan}
                                    </span>
                                    <span
                                        className={`ml-4 font-mono ${
                                            analysis.eval > 0 ? 'text-green-600' : 'text-red-600'
                                        }`}
                                    >
                                        {analysis.eval > 0 ? '+' : ''}
                                        {analysis.eval}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                暂无分析结果，请稍后重试。
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
