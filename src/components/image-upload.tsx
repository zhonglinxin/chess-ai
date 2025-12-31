'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
    onImageSelected: (file: File) => void;
    isAnalyzing?: boolean;
}

export function ImageUpload({ onImageSelected, isAnalyzing = false }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleFile = (file: File) => {
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        onImageSelected(file);
    };

    const clearImage = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-4">
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <CardContent className="flex flex-col items-center justify-center gap-4">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    {preview ? (
                        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                            <Image
                                src={preview}
                                alt="Chessboard preview"
                                fill
                                className="object-contain"
                            />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={clearImage}
                                disabled={isAnalyzing}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4 text-gray-500">
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                <Camera className="w-8 h-8 opacity-70" />
                            </div>
                            <p className="text-center text-sm font-medium">
                                点击下方按钮拍摄或上传棋盘照片
                            </p>
                        </div>
                    )}

                    {!preview && (
                        <div className="flex gap-4 w-full">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 gap-2"
                                variant="outline"
                            >
                                <Upload className="w-4 h-4" />
                                上传图片
                            </Button>
                            <Button
                                onClick={() => {
                                    // Mobile camera trigger usually works via file input with capture attribute
                                    // But since we use one input, we can just click it.
                                    // To differentiate, we might need two inputs or just rely on OS chooser.
                                    // For better UX, we can hint at camera usage.
                                    fileInputRef.current?.setAttribute('capture', 'environment');
                                    fileInputRef.current?.click();
                                    // Reset capture after click to allow gallery select next time if needed? 
                                    // Or just keep it simple for now. 
                                }}
                                className="flex-1 gap-2"
                            >
                                <Camera className="w-4 h-4" />
                                拍摄照片
                            </Button>
                        </div>
                    )}

                    {preview && (
                        <p className="text-xs text-muted-foreground mt-2">
                            请确保棋盘完整清晰，光线充足
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
