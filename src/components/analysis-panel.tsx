'use client';

import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzePosition, explainMove, StockfishResponse } from '@/app/actions';
import { Loader2, Lightbulb, Trophy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnalysisPanelProps {
    fen: string;
}

export function AnalysisPanel({ fen }: AnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<StockfishResponse | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [explanation, setExplanation] = useState<string>('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [boardWidth, setBoardWidth] = useState(300);

    useEffect(() => {
        // Responsive board width
        const updateWidth = () => {
            const width = Math.min(window.innerWidth - 64, 400);
            setBoardWidth(width);
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    useEffect(() => {
        if (!fen) return;

        const runAnalysis = async () => {
            setIsAnalyzing(true);
            setAnalysis(null);
            setExplanation('');

            const result = await analyzePosition(fen);

            setIsAnalyzing(false);

            if ('error' in result) {
                console.error(result.error);
                return;
            }

            setAnalysis(result);

            // Trigger explanation
            setIsExplaining(true);
            try {
                const text = await explainMove(fen, result.lan, result.eval);
                setExplanation(text);
            } catch (err) {
                console.error(err);
                setExplanation("无法获取大师点评，请稍后重试。");
            } finally {
                setIsExplaining(false);
            }
        };

        runAnalysis();
    }, [fen]);

    // Helper to parse move string "e2e4" -> ["e2", "e4"]
    const getMoveArrows = () => {
        if (!analysis?.lan) return [];
        const from = analysis.lan.substring(0, 2) as any;
        const to = analysis.lan.substring(2, 4) as any;
        return [[from, to]];
    };

    return (
        <div className="space-y-6 w-full max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        局面分析
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <div className="mb-4">
                        <Chessboard
                            position={fen}
                            boardWidth={boardWidth}
                            customArrows={analysis ? getMoveArrows() : []}
                            arePiecesDraggable={false}
                        />
                    </div>

                    {isAnalyzing ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            正在计算最佳走法...
                        </div>
                    ) : analysis ? (
                        <div className="text-center w-full">
                            <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                <span className="font-bold mr-2">最佳走法:</span>
                                <span className="text-blue-600 font-mono text-lg">{analysis.san || analysis.lan}</span>
                                <span className={`ml-4 font-mono ${analysis.eval > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {analysis.eval > 0 ? '+' : ''}{analysis.eval}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {(isExplaining || explanation) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                            大师点评
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                            <div className="prose dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
                                {explanation}
                            </div>
                            {isExplaining && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
