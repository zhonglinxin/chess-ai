'use server';

import Replicate from 'replicate';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function recognizeChessboard(formData: FormData) {
    const file = formData.get('image') as File;

    if (!file) {
        throw new Error('No image provided');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    try {
        const output = await replicate.run("google/gemini-3-pro", {
            input: {
                images: [base64Image],
                prompt: "Analyze this chessboard image and return the FEN string of the current position. Return ONLY the FEN string, no other text or explanation. If the board is not clear or recognized, return 'error'.",
            }
        });

        // Replicate returns array of strings for text generation usually, or sometimes just string depending on model
        // Gemini model on Replicate usually returns list of strings.
        const text = Array.isArray(output) ? output.join('') : String(output);

        return { fen: text.trim() };
    } catch (error) {
        console.error('Error recognizing chessboard:', error);
        return { error: 'Failed to recognize chessboard. Please try again.' };
    }
}

export type StockfishResponse = {
    text: string;
    eval: number;
    move: string;
    lan: string; // Long algebraic notation
    fen: string;
    depth: number;
    winChance: number;
    continuationArr: string[];
    mate: number | null;
    san: string;
};

export async function analyzePosition(fen: string): Promise<StockfishResponse | { error: string }> {
    try {
        const response = await fetch('https://chess-api.com/v1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen }),
        });

        if (!response.ok) {
            throw new Error(`Stockfish API failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error analyzing position:', error);
        return { error: 'Failed to analyze position.' };
    }
}

export async function explainMove(fen: string, move: string, evaluation: number) {
    try {
        const prompt = `你是一位国际象棋大师。当前棋局 FEN 为 ${fen}。Stockfish 推荐的走法是 ${move}，评价分数为 ${evaluation}。请用 3-5 句话解释：1. 这一步的直接威胁是什么？2. 它如何改善了己方的结构或空间？3. 对方可能的后续手段。`;

        console.log(prompt);
        const output = await replicate.run("google/gemini-3-pro", {
            input: {
                prompt: prompt,
                thinking_level: "low", // Optional based on user request example
            }
        });

        return Array.isArray(output) ? output.join('') : String(output);
    } catch (error) {
        console.error("Error explaining move:", error);
        throw new Error("Failed to generate explanation");
    }
}
