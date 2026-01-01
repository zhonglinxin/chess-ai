import { useCallback, useEffect, useRef, useState } from 'react';

export type StockfishLine = {
    multipv: number;
    depth: number;
    scoreType: 'cp' | 'mate';
    score: number;
    pv: string[];
};

type EngineStatus = 'loading' | 'ready' | 'error';

type UseStockfishOptions = {
    multiPv?: number;
};

const parseInfoLine = (
    line: string,
    perspective: number
): Omit<StockfishLine, 'pv'> & { pv: string[] } | null => {
    if (!line.startsWith('info') || !line.includes(' pv ')) return null;

    const multipvMatch = line.match(/\bmultipv (\d+)/);
    const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);
    if (!multipvMatch || !scoreMatch || !pvMatch) return null;

    const depthMatch = line.match(/\bdepth (\d+)/);

    return {
        multipv: Number(multipvMatch[1]),
        depth: depthMatch ? Number(depthMatch[1]) : 0,
        scoreType: scoreMatch[1] as 'cp' | 'mate',
        score: Number(scoreMatch[2]) * perspective,
        pv: pvMatch[1].trim().split(' '),
    };
};

const buildEmptyLines = (count: number) =>
    Array.from({ length: count }, () => null) as Array<StockfishLine | null>;

export function useStockfish(options: UseStockfishOptions = {}) {
    const multiPv = options.multiPv ?? 3;
    const [status, setStatus] = useState<EngineStatus>('loading');
    const [lines, setLines] = useState<Array<StockfishLine | null>>(() =>
        buildEmptyLines(multiPv)
    );
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<{ fen: string; depth: number } | null>(null);
    const perspectiveRef = useRef(1);

    const resetLines = useCallback(() => {
        setLines(buildEmptyLines(multiPv));
    }, [multiPv]);

    const startSearch = useCallback(
        (fen: string, depth: number) => {
            if (!workerRef.current) return;

            perspectiveRef.current = fen.split(' ')[1] === 'b' ? -1 : 1;
            resetLines();
            setIsAnalyzing(true);

            workerRef.current.postMessage('stop');
            workerRef.current.postMessage(`position fen ${fen}`);
            workerRef.current.postMessage(`go depth ${depth}`);
        },
        [resetLines]
    );

    const evaluatePosition = useCallback(
        (fen: string, depth: number) => {
            if (!workerRef.current) return;

            if (!readyRef.current) {
                pendingRef.current = { fen, depth };
                return;
            }

            startSearch(fen, depth);
        },
        [startSearch]
    );

    const stop = useCallback(() => {
        if (!workerRef.current) return;
        workerRef.current.postMessage('stop');
        setIsAnalyzing(false);
    }, []);

    useEffect(() => {
        resetLines();
    }, [resetLines]);

    useEffect(() => {
        const worker = new Worker('/stockfish/stockfish.js');
        workerRef.current = worker;
        readyRef.current = false;
        setStatus('loading');

        worker.onmessage = (event) => {
            const message = String(event.data).trim();

            if (message === 'uciok') {
                worker.postMessage(`setoption name MultiPV value ${multiPv}`);
                worker.postMessage('isready');
                return;
            }

            if (message === 'readyok') {
                readyRef.current = true;
                setStatus('ready');

                if (pendingRef.current) {
                    const pending = pendingRef.current;
                    pendingRef.current = null;
                    startSearch(pending.fen, pending.depth);
                }
                return;
            }

            if (message.startsWith('bestmove')) {
                setIsAnalyzing(false);
                return;
            }

            const info = parseInfoLine(message, perspectiveRef.current);
            if (!info) return;

            if (info.multipv < 1 || info.multipv > multiPv) return;

            setLines((prev) => {
                const next = [...prev];
                const index = info.multipv - 1;
                const current = next[index];
                if (!current || info.depth >= current.depth) {
                    next[index] = info;
                }
                return next;
            });
        };

        worker.onerror = () => {
            setStatus('error');
        };

        worker.postMessage('uci');

        return () => {
            worker.terminate();
            workerRef.current = null;
            readyRef.current = false;
        };
    }, [multiPv, startSearch]);

    return {
        status,
        lines,
        isAnalyzing,
        evaluatePosition,
        stop,
    };
}
