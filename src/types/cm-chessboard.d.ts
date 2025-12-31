declare module 'cm-chessboard' {
    export const COLOR: {
        white: 'w';
        black: 'b';
    };
    export const MOVE_INPUT_MODE: {
        viewOnly: number;
        dragPiece: number;
        dragMarker: number;
    };
    export const INPUT_EVENT_TYPE: {
        moveStart: string;
        moveDone: string;
        moveCanceled: string;
        context: string;
        click: string;
    };

    export interface ChessboardStyle {
        cssClass?: string;
        showCoordinates?: boolean;
        showBorder?: boolean;
        aspectRatio?: number | null;
    }

    export interface ChessboardConfig {
        position?: string;
        orientation?: string;
        style?: ChessboardStyle;
        responsive?: boolean;
        animationDuration?: number;
        moveInputMode?: number;
        sprite?: {
            url?: string;
            grid?: number;
        };
    }

    export class Chessboard {
        constructor(element: HTMLElement | null, props?: ChessboardConfig);
        setPosition(fen: string, animated?: boolean): Promise<void>;
        getPosition(): string;
        enableMoveInput(eventHandler: (event: unknown) => unknown, color?: string | null): void;
        disableMoveInput(): void;
        destroy(): Promise<void>;
    }
}

declare module 'cm-chessboard/src/cm-chessboard/Chessboard.js' {
    export const COLOR: {
        white: 'w';
        black: 'b';
    };
    export const MOVE_INPUT_MODE: {
        viewOnly: number;
        dragPiece: number;
        dragMarker: number;
    };
    export const INPUT_EVENT_TYPE: {
        moveStart: string;
        moveDone: string;
        moveCanceled: string;
        context: string;
        click: string;
    };

    export interface ChessboardStyle {
        cssClass?: string;
        showCoordinates?: boolean;
        showBorder?: boolean;
        aspectRatio?: number | null;
    }

    export interface ChessboardConfig {
        position?: string;
        orientation?: string;
        style?: ChessboardStyle;
        responsive?: boolean;
        animationDuration?: number;
        moveInputMode?: number;
        sprite?: {
            url?: string;
            grid?: number;
        };
    }

    export interface ChessMoveEvent {
        chessboard: any;
        type: string;
        square?: string;
        squareFrom?: string;
        squareTo?: string;
    }

    export class Chessboard {
        constructor(element: HTMLElement | null, props?: ChessboardConfig);
        setPosition(fen: string, animated?: boolean): Promise<void>;
        getPosition(): string;
        enableMoveInput(eventHandler: (event: any) => any, color?: string | null): void;
        disableMoveInput(): void;
        destroy(): Promise<void>;
    }
}

declare module 'cm-chessboard/styles/cm-chessboard.css';
