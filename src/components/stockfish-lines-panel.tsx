'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStockfish, type StockfishLine } from '@/hooks/use-stockfish';
import { ChevronDown, ChevronUp, Loader2, Radar } from 'lucide-react';
import type { Square } from 'chess.js';

interface StockfishLinesPanelProps {
    fen: string;
    disabled?: boolean;
    depth?: number;
    onMoveSelect?: (move: { from: Square; to: Square } | null) => void;
}

const DEFAULT_DEPTH = 20;
const LINES_COUNT = 3;

const buildFlags = (value: boolean) =>
    Array.from({ length: LINES_COUNT }, () => value);

const formatScore = (line: StockfishLine | null) => {
    if (!line) return '--';
    if (line.scoreType === 'mate') {
        return `#${line.score}`;
    }

    const value = (line.score / 100).toFixed(2);
    return `${line.score >= 0 ? '+' : ''}${value}`;
};

const parseUciMove = (uci: string): { from: Square; to: Square } | null => {
    const match = uci.match(/^([a-h][1-8])([a-h][1-8])/i);
    if (!match) return null;

    return {
        from: match[1].toLowerCase() as Square,
        to: match[2].toLowerCase() as Square,
    };
};

export function StockfishLinesPanel({
    fen,
    disabled = false,
    depth = DEFAULT_DEPTH,
    onMoveSelect,
}: StockfishLinesPanelProps) {
    const { status, lines, isAnalyzing, evaluatePosition, stop } = useStockfish({
        multiPv: LINES_COUNT,
    });
    const lineTextRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const [expandedRows, setExpandedRows] = useState<boolean[]>(() => buildFlags(false));
    const [overflowingRows, setOverflowingRows] = useState<boolean[]>(() => buildFlags(false));

    useEffect(() => {
        if (disabled) {
            stop();
            return;
        }

        if (status !== 'ready') return;
        evaluatePosition(fen, depth);
    }, [disabled, status, fen, depth, evaluatePosition, stop]);

    useEffect(() => {
        setExpandedRows(buildFlags(false));
    }, [fen]);

    useEffect(() => {
        const updateOverflow = () => {
            setOverflowingRows((prev) => {
                const next = [...prev];
                lineTextRefs.current.forEach((element, index) => {
                    if (!element) {
                        next[index] = false;
                        return;
                    }
                    next[index] = element.scrollWidth > element.clientWidth;
                });
                return next;
            });
        };

        updateOverflow();
        window.addEventListener('resize', updateOverflow);
        return () => window.removeEventListener('resize', updateOverflow);
    }, [lines]);

    const statusText = useMemo(() => {
        if (disabled) return '请先输入有效 FEN。';
        if (status === 'loading') return 'Stockfish 引擎加载中...';
        if (status === 'error') return '引擎启动失败，请刷新重试。';
        if (isAnalyzing) return '实时分析中...';
        return '引擎已就绪。';
    }, [disabled, status, isAnalyzing, depth]);

    return (
        <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2">
                    <Radar className="h-5 w-5 text-zinc-500" />
                    Stockfish
                </CardTitle>
                <span className="text-xs text-muted-foreground">{statusText}</span>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
                <p className="text-xs text-muted-foreground">
                    评分为白方视角，+0.60 表示白方优势约 0.6 兵。序列为引擎预估后续走法。
                </p>
                {(status === 'loading' || isAnalyzing) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        引擎输出刷新中...
                    </div>
                )}
                {lines.map((line, index) => {
                    const scoreClass =
                        line && line.score >= 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : line
                                ? 'border-rose-200 bg-rose-50 text-rose-600'
                                : 'border-zinc-200 bg-zinc-100 text-zinc-400';
                    const move = line?.pv?.[0];
                    const pvText = line?.pv?.length ? line.pv.join(' ') : '等待引擎输出...';
                    const showToggle = (overflowingRows[index] || expandedRows[index]) && !!line?.pv?.length;

                    return (
                        <div
                            key={`stockfish-line-${index}`}
                            className="rounded-md border border-zinc-200/80 bg-white/70 px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                        >
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-disabled="true"
                                    className={`inline-flex cursor-default items-center rounded-full border px-2 py-1 font-mono text-xs ${scoreClass}`}
                                >
                                    {formatScore(line)}
                                </button>
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 font-mono text-xs"
                                        disabled={!move}
                                        onClick={() => {
                                            if (!move || !onMoveSelect) return;
                                            const parsed = parseUciMove(move);
                                            if (parsed) {
                                                onMoveSelect(parsed);
                                            }
                                        }}
                                    >
                                        {move ?? '--'}
                                    </Button>
                                    <span
                                        ref={(element) => {
                                            lineTextRefs.current[index] = element;
                                        }}
                                        className={`min-w-0 flex-1 font-mono text-zinc-600 dark:text-zinc-300 ${
                                            expandedRows[index]
                                                ? 'whitespace-normal break-words'
                                                : 'truncate'
                                        }`}
                                    >
                                        {pvText}
                                    </span>
                                </div>
                                {showToggle && (
                                    <button
                                        type="button"
                                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                        onClick={() =>
                                            setExpandedRows((prev) => {
                                                const next = [...prev];
                                                next[index] = !next[index];
                                                return next;
                                            })
                                        }
                                        aria-label={expandedRows[index] ? '收起' : '展开'}
                                    >
                                        {expandedRows[index] ? (
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
