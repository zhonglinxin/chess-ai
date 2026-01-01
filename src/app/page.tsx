'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, validateFen as validateFenString } from 'chess.js';
import type { Move, Square } from 'chess.js';
import { Chessboard, COLOR, MOVE_INPUT_MODE, INPUT_EVENT_TYPE } from 'cm-chessboard/src/cm-chessboard/Chessboard.js';
import 'cm-chessboard/styles/cm-chessboard.css';
import { ImageUpload } from '@/components/image-upload';
import { AnalysisPanel } from '@/components/analysis-panel';
import { BestMovePanel } from '@/components/best-move-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { recognizeChessboard } from './actions';
import { useHistory } from '@/hooks/use-history';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type FenStatusState = 'idle' | 'ok' | 'error';

interface ChessMoveEvent {
    chessboard: Chessboard;
    type: string;
    square?: string;
    squareFrom?: string;
    squareTo?: string;
}

type BoardMetrics = {
    width: number;
    height: number;
    borderSize: number;
    squareWidth: number;
    squareHeight: number;
};

const DEFAULT_FEN = new Chess().fen();
const SPRITE_URL = '/chessboard-sprite.svg';

const random = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const getSquareCenter = (square: Square, metrics: BoardMetrics) => {
    const fileIndex = square.charCodeAt(0) - 97;
    const rankIndex = Number(square[1]) - 1;
    const x = metrics.borderSize + (fileIndex + 0.5) * metrics.squareWidth;
    const y = metrics.borderSize + (7 - rankIndex + 0.5) * metrics.squareHeight;

    return { x, y };
};

export default function Home() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [fen, setFen] = useState(DEFAULT_FEN);
    const [fenInput, setFenInput] = useState(DEFAULT_FEN);
    const [fenError, setFenError] = useState<string | null>(null);
    const [fenStatusMessage, setFenStatusMessage] = useState('');
    const [fenStatusState, setFenStatusState] = useState<FenStatusState>('idle');
    const [analysisFen, setAnalysisFen] = useState<string | null>(null);
    const [analysisRequestId, setAnalysisRequestId] = useState(0);
    const [bestMoveFen, setBestMoveFen] = useState<string | null>(null);
    const [bestMoveRequestId, setBestMoveRequestId] = useState(0);
    const [bestMoveArrow, setBestMoveArrow] = useState<{ from: Square; to: Square } | null>(null);
    const [boardMetrics, setBoardMetrics] = useState<BoardMetrics | null>(null);
    const [promotion, setPromotion] = useState('q');

    const boardElementRef = useRef<HTMLDivElement | null>(null);
    const boardRef = useRef<Chessboard | null>(null);
    const gameRef = useRef(new Chess(DEFAULT_FEN));
    const promotionRef = useRef(promotion);
    const { history, saveToHistory } = useHistory();
    const saveToHistoryRef = useRef(saveToHistory);

    useEffect(() => {
        promotionRef.current = promotion;
    }, [promotion]);

    useEffect(() => {
        saveToHistoryRef.current = saveToHistory;
    }, [saveToHistory]);

    const normalizeFenInput = useCallback((value: string) => {
        return value
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\u00A0/g, ' ')
            .replace(/[－–—−]/g, '-')
            .replace(/／/g, '/')
            .replace(/[０-９]/g, (char) =>
                String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30)
            )
            .replace(/[Ａ-Ｚ]/g, (char) =>
                String.fromCharCode(char.charCodeAt(0) - 0xff21 + 0x41)
            )
            .replace(/[ａ-ｚ]/g, (char) =>
                String.fromCharCode(char.charCodeAt(0) - 0xff41 + 0x61)
            )
            .replace(/^fen\s*[:：=]\s*/i, '')
            .trim()
            .replace(/\s+/g, ' ');
    }, []);

    const setFenStatus = useCallback((message: string, state: FenStatusState = 'idle') => {
        setFenStatusMessage(message);
        setFenStatusState(state);
    }, []);

    const syncFenOutput = useCallback(() => {
        const nextFen = gameRef.current.fen();
        setFen(nextFen);
        setFenInput(nextFen);
    }, []);

    const checkGameState = useCallback(() => {
        const game = gameRef.current;
        if (game.isGameOver()) {
            if (game.isCheckmate()) {
                console.log('checkmate');
            }
            if (game.isDraw()) {
                console.log('draw');
            }
            if (game.isStalemate()) {
                console.log('stalemate');
            }
            if (game.isThreefoldRepetition()) {
                console.log('threefold repetition');
            }
            if (game.isInsufficientMaterial()) {
                console.log('insufficient material');
            }
            boardRef.current?.disableMoveInput();
            return true;
        }
        return false;
    }, []);

    const handleMove = useCallback(
        (event: ChessMoveEvent): Move | boolean | null => {
            const game = gameRef.current;

            if (game.isGameOver()) {
                return true;
            }

            if (event.type === INPUT_EVENT_TYPE.moveDone) {
                if (!event.squareFrom || !event.squareTo) {
                    return false;
                }

                const move: { from: Square; to: Square; promotion?: string } = {
                    from: event.squareFrom as Square,
                    to: event.squareTo as Square,
                };

                const promotionMoves = game.moves({ square: event.squareFrom as Square });
                if (promotionMoves.some((candidate) => candidate.includes('='))) {
                    move.promotion = promotionRef.current;
                }

                let result: Move | null = null;

                try {
                    result = game.move(move);
                } catch (error) {
                    result = null;
                }

                if (result) {
                    boardRef.current?.disableMoveInput();
                    boardRef.current?.setPosition(game.fen());
                    syncFenOutput();
                    setFenError(null);
                    setFenStatus('', 'idle');
                    setAnalysisFen(null);
                    setAnalysisRequestId(0);
                    setBestMoveFen(null);
                    setBestMoveRequestId(0);
                    setBestMoveArrow(null);

                    if (checkGameState()) {
                        return true;
                    }

                    const possibleMoves = game.moves({ verbose: true }) as Move[];
                    if (possibleMoves.length > 0) {
                        const reply = possibleMoves[random(0, possibleMoves.length - 1)];
                        game.move({
                            from: reply.from,
                            to: reply.to,
                            promotion: reply.promotion,
                        });
                        boardRef.current?.enableMoveInput(handleMove, COLOR.white);
                        boardRef.current?.setPosition(game.fen());
                        syncFenOutput();
                        setAnalysisFen(null);
                        setAnalysisRequestId(0);
                        setBestMoveFen(null);
                        setBestMoveRequestId(0);
                        setBestMoveArrow(null);

                        if (checkGameState()) {
                            return true;
                        }
                    }
                } else {
                    alert(`invalid move: ${JSON.stringify(move)}`);
                }

                return result;
            }

            return true;
        },
        [checkGameState, setFenStatus, syncFenOutput]
    );

    useEffect(() => {
        const element = boardElementRef.current;
        if (!element) return;

        const board = new Chessboard(element, {
            position: 'start',
            orientation: COLOR.white,
            style: {
                cssClass: 'default',
                showCoordinates: true,
                showBorder: false,
                aspectRatio: 0.9,
            },
            responsive: true,
            animationDuration: 300,
            moveInputMode: MOVE_INPUT_MODE.dragPiece,
            sprite: {
                url: SPRITE_URL,
                grid: 40,
            },
        });

        boardRef.current = board;
        board.enableMoveInput(handleMove, COLOR.white);
        board.setPosition(gameRef.current.fen());
        syncFenOutput();

        return () => {
            board.destroy();
            boardRef.current = null;
        };
    }, [handleMove, syncFenOutput]);

    useEffect(() => {
        const element = boardElementRef.current;
        if (!element) return;

        const updateMetrics = () => {
            const width = element.offsetWidth;
            const height = element.offsetHeight;
            if (!width || !height) return;

            const borderSize = width / 320;
            const innerWidth = width - 2 * borderSize;
            const innerHeight = height - 2 * borderSize;

            setBoardMetrics({
                width,
                height,
                borderSize,
                squareWidth: innerWidth / 8,
                squareHeight: innerHeight / 8,
            });
        };

        updateMetrics();
        const observer = new ResizeObserver(() => updateMetrics());
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const applyFen = useCallback(
        (value: string, options?: { saveToHistory?: boolean }) => {
            const normalized = normalizeFenInput(value);
            setFenInput(value);

            if (!normalized) {
                setFenStatus('请输入 FEN。', 'error');
                setFenError('请输入 FEN。');
                return false;
            }

            const validation = validateFenString(normalized);
            if (!validation.ok) {
                const message = `FEN 格式无效：${validation.error ?? '未知错误'}`;
                setFenStatus(message, 'error');
                setFenError(message);
                return false;
            }

            try {
                gameRef.current.load(normalized);
            } catch (error) {
                setFenStatus('FEN 格式无效。', 'error');
                setFenError('FEN 格式无效。');
                return false;
            }

            const nextFen = gameRef.current.fen();
            boardRef.current?.setPosition(nextFen);
            setFen(nextFen);
            setFenInput(nextFen);
            setFenError(null);
            setFenStatus('棋盘已加载。', 'ok');
            setAnalysisFen(null);
            setAnalysisRequestId(0);
            setBestMoveFen(null);
            setBestMoveRequestId(0);
            setBestMoveArrow(null);

            if (options?.saveToHistory) {
                saveToHistoryRef.current(nextFen);
            }

            if (gameRef.current.isGameOver()) {
                boardRef.current?.disableMoveInput();
            } else {
                boardRef.current?.enableMoveInput(handleMove, COLOR.white);
            }

            return true;
        },
        [handleMove, normalizeFenInput, setFenStatus]
    );

    const handleImageSelected = (file: File) => {
        setSelectedImage(file);
    };

    const loadFromHistory = (historyFen: string) => {
        setSelectedImage(null);
        applyFen(historyFen);
    };

    const startRecognition = async () => {
        if (!selectedImage) return;

        setIsRecognizing(true);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);

            const result = await recognizeChessboard(formData);

            if (result.error) {
                alert(result.error);
            } else if (result.fen) {
                const applied = applyFen(result.fen, { saveToHistory: true });
                if (!applied) {
                    alert('识别结果不是有效 FEN，请重试');
                }
            }
        } catch (error) {
            console.error(error);
            alert('识别失败，请重试');
        } finally {
            setIsRecognizing(false);
        }
    };

    const handleAnalyze = () => {
        if (fenError) return;
        setAnalysisFen(fen);
        setAnalysisRequestId((prev) => prev + 1);
    };

    const handleBestMove = () => {
        if (fenError) return;
        setBestMoveFen(fen);
        setBestMoveRequestId((prev) => prev + 1);
    };

    const handleFenInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFenInput(event.target.value);
        setFenError(null);
        setFenStatus('', 'idle');
    };

    const handleFenKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFen(fenInput);
        }
    };

    const handlePromotionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setPromotion(event.target.value);
    };

    const fenStatusText =
        fenStatusMessage ||
        '输入 FEN 并点击加载，或按回车同步棋盘。';

    const fenStatusClassName =
        fenStatusState === 'error'
            ? 'text-red-500'
            : fenStatusState === 'ok'
                ? 'text-emerald-600'
                : 'text-muted-foreground';

    const bestMoveArrowSpec = useMemo(() => {
        if (!bestMoveArrow || !boardMetrics) return null;
        const from = getSquareCenter(bestMoveArrow.from, boardMetrics);
        const to = getSquareCenter(bestMoveArrow.to, boardMetrics);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (!distance) return null;

        const baseSize = Math.min(boardMetrics.squareWidth, boardMetrics.squareHeight);
        const inset = baseSize * 0.25;
        const startX = from.x + (dx / distance) * inset;
        const startY = from.y + (dy / distance) * inset;
        const endX = to.x - (dx / distance) * inset;
        const endY = to.y - (dy / distance) * inset;
        const tipOffset = 4;
        const adjustedEndX = endX - (dx / distance) * tipOffset;
        const adjustedEndY = endY - (dy / distance) * tipOffset;
        const thickness = baseSize * 0.4;
        const headSize = thickness * 1.2;
        const headPoints = `0 0, ${headSize} ${headSize / 2}, 0 ${headSize}`;

        return {
            startX,
            startY,
            endX: adjustedEndX,
            endY: adjustedEndY,
            thickness,
            headSize,
            headPoints,
        };
    }, [bestMoveArrow, boardMetrics]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
            <div className="mx-auto max-w-6xl px-4 pb-16">
                <header className="mb-8 pt-8 text-center lg:text-left">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-zinc-900 dark:text-zinc-50">
                        AI 国际象棋助手
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        拍照识别棋局，获取大师级分析
                    </p>
                </header>

                <main className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                    <aside className="space-y-6 lg:sticky lg:top-8 self-start">
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center gap-2">
                                    棋盘
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <div ref={boardElementRef} className="chessboard w-full" />
                                    {bestMoveArrowSpec && boardMetrics && (
                                        <svg
                                            className="pointer-events-none absolute inset-0"
                                            viewBox={`0 0 ${boardMetrics.width} ${boardMetrics.height}`}
                                        >
                                            <defs>
                                                <marker
                                                    id="best-move-arrow"
                                                    markerWidth={bestMoveArrowSpec.headSize}
                                                    markerHeight={bestMoveArrowSpec.headSize}
                                                    refX={0}
                                                    refY={bestMoveArrowSpec.headSize / 2}
                                                    orient="auto"
                                                    markerUnits="userSpaceOnUse"
                                                >
                                                    <polygon
                                                        points={bestMoveArrowSpec.headPoints}
                                                        fill="rgba(128, 128, 128, 0.55)"
                                                    />
                                                </marker>
                                            </defs>
                                            <line
                                                x1={bestMoveArrowSpec.startX}
                                                y1={bestMoveArrowSpec.startY}
                                                x2={bestMoveArrowSpec.endX}
                                                y2={bestMoveArrowSpec.endY}
                                                stroke="rgba(128, 128, 128, 0.55)"
                                                strokeWidth={bestMoveArrowSpec.thickness}
                                                strokeLinecap="butt"
                                                strokeLinejoin="round"
                                                markerEnd="url(#best-move-arrow)"
                                            />
                                        </svg>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fen-input">FEN</Label>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            id="fen-input"
                                            value={fenInput}
                                            onChange={handleFenInputChange}
                                            onKeyDown={handleFenKeyDown}
                                            className="font-mono text-xs flex-1"
                                            spellCheck={false}
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => applyFen(fenInput)}
                                            className="sm:w-auto"
                                        >
                                            加载
                                        </Button>
                                    </div>
                                    <p
                                        className={`text-xs min-h-[18px] ${fenStatusClassName}`}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {fenStatusText}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="promotion">兵升变为</Label>
                                    <select
                                        id="promotion"
                                        value={promotion}
                                        onChange={handlePromotionChange}
                                        className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    >
                                        <option value="q">后</option>
                                        <option value="r">车</option>
                                        <option value="b">象</option>
                                        <option value="n">马</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    <section className="space-y-10">
                        <section className="space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                                    图像识别
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    上传或拍摄棋盘照片，自动识别并填充 FEN。
                                </p>
                            </div>

                            <ImageUpload
                                onImageSelected={handleImageSelected}
                                isAnalyzing={isRecognizing}
                            />

                            {selectedImage && (
                                <div className="flex justify-center sm:justify-start">
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
                                            '开始识别'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </section>

                        {history.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-medium text-zinc-500">历史记录</h3>
                                <div className="space-y-2">
                                    {history.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => loadFromHistory(item.fen)}
                                            className="p-3 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex justify-between items-center"
                                        >
                                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[240px]">
                                                {item.fen}
                                            </span>
                                            <span className="text-xs text-zinc-400">
                                                {formatDistanceToNow(item.timestamp, {
                                                    addSuffix: true,
                                                    locale: zhCN,
                                                })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                                    局面分析
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={handleBestMove}
                                        disabled={!!fenError}
                                    >
                                        最佳走法
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleAnalyze}
                                        disabled={!!fenError}
                                    >
                                        {analysisRequestId > 0 ? '重新点评' : '大师点评'}
                                    </Button>
                                </div>
                            </div>
                            {fenError && (
                                <p className="text-xs text-red-500">
                                    请先输入有效 FEN，再进行最佳走法或点评。
                                </p>
                            )}
                            <BestMovePanel
                                fen={bestMoveFen}
                                requestId={bestMoveRequestId}
                                onBestMove={setBestMoveArrow}
                            />
                            <AnalysisPanel fen={analysisFen} requestId={analysisRequestId} />
                        </section>
                    </section>
                </main>
            </div>
        </div>
    );
}
