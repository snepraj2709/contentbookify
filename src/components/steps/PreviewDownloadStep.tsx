
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Book, Download, FileText, Loader2, Share2, Star, CheckCircle2, Clock, AlignLeft } from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/components/ui/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const PreviewDownloadStep: React.FC = () => {
    const { state, setBookFormat, setCurrentStep } = useBook();
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const { toast } = useToast();

    // Reset success state on mount
    useEffect(() => {
        setDownloadSuccess(false);
    }, []);

    const handleDownload = async () => {
        setIsDownloading(true);

        try {
            console.log('Starting book generation...', state.book);

            // Call the Python backend to generate the book
            const backendUrl = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl.replace(/\/$/, '')}/generate-book/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    book: state.book,
                }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.detail || 'Failed to generate book');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error('Failed to generate book');
            }

            console.log('Book generated successfully:', data);

            // Convert base64 content back to blob and download
            const binaryString = atob(data.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: data.mimeType });
            const url = URL.createObjectURL(blob);
            
            const element = document.createElement('a');
            element.href = url;
            element.download = data.fileName;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            URL.revokeObjectURL(url);

            setDownloadSuccess(true);
            toast({
                title: 'Book Created',
                description: `Your ${state.book.format} book has been successfully created and downloaded.`,
            });
        } catch (error) {
            console.error('Download error:', error);
            toast({
                title: 'Download failed',
                description: 'There was an error creating your book. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    // Helper calculate reading time
    const calculateReadingTime = () => {
        const totalWords = state.book.chapters.reduce((acc, curr) => {
             return acc + (curr.content?.split(/\s+/).length || 0);
        }, 0);
        return Math.ceil(totalWords / 200);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='w-full max-w-5xl mx-auto py-8'
        >
            <div className='text-center mb-12 space-y-2'>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="inline-flex items-center justify-center p-2 px-4 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4 animate-in fade-in zoom-in duration-500">
                        <Star className="w-4 h-4 mr-2 fill-green-700" />
                        Ready to Publish
                    </div>
                </motion.div>
                <h2 className='text-4xl font-serif font-bold tracking-tight text-foreground'>
                    Your Book is Ready!
                </h2>
                <p className='text-muted-foreground text-lg'>
                    Review the details and download your masterpiece.
                </p>
            </div>

            <div className='grid md:grid-cols-2 gap-12 items-center'>
                {/* Left: Immersive Preview */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center"
                >
                    <div className="relative group perspective-1000">
                         {/* Glow effect */}
                        <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
                        
                        {/* 3D Book */}
                        <div 
                            className="relative w-[300px] aspect-[2/3] transition-transform duration-500 transform-style-3d group-hover:rotate-y-[-12deg] group-hover:rotate-x-[5deg]"
                            style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg) rotateX(5deg)' }}
                        >
                            {/* Front Cover */}
                            <div className="absolute inset-0 rounded-r-lg rounded-l-sm shadow-2xl overflow-hidden bg-white z-10 origin-left" style={{ backfaceVisibility: 'hidden' }}>
                                {state.book.coverImage ? (
                                    <div className="w-full h-full relative">
                                        <img 
                                            src={state.book.coverImage.url} 
                                            alt={state.book.title} 
                                            className="w-full h-full object-cover" 
                                        />
                                        {/* Overlay Title for Generated/Templates that don't have burned-in text yet? (Actually CoverDesignStep overlays it visually but not on the image itself unless we use canvas. 
                                            For this preview rely on the image if possible, or re-render overlay simple if needed. 
                                            Assuming coverImage.url is the final image or a clean background.
                                            Let's re-render text overlay for consistency if it's a template) 
                                        */}
                                        <div className={cn(
                                            "absolute inset-0 p-6 flex flex-col justify-end bg-black/10",
                                            state.book.coverOptions?.layout === 'center' ? 'text-center items-center' : 
                                            state.book.coverOptions?.layout === 'right' ? 'text-right items-end' : 'text-left items-start'
                                        )}>
                                            <h1 
                                                className={cn("text-2xl font-bold leading-tight drop-shadow-md mb-1", 
                                                    state.book.coverOptions?.fontFamily === 'sans' ? 'font-sans' : 
                                                    state.book.coverOptions?.fontFamily === 'display' ? 'font-sans tracking-tight' : 'font-serif'
                                                )}
                                                style={{ color: state.book.coverOptions?.titleColor }}
                                            >
                                                {state.book.title}
                                            </h1>
                                            <p 
                                                className="text-sm font-medium drop-shadow-md opacity-90"
                                                style={{ color: state.book.coverOptions?.subtitleColor }}
                                            >
                                                {state.book.author}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                        <Book className="w-16 h-16 text-slate-400" />
                                    </div>
                                )}
                                
                                {/* Spine highlight */}
                                <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white/40 to-transparent pointer-events-none" />
                            </div>

                            {/* Book Pages Side (Thickness) */}
                            <div 
                                className="absolute top-1 bottom-1 right-0 w-[40px] bg-white transform translate-x-[38px] translate-z-[-20px] rotate-y-90 origin-left"
                                style={{ 
                                    backgroundImage: 'linear-gradient(to right, #e2e2e2 1px, transparent 1px)', 
                                    backgroundSize: '3px 100%' 
                                }} 
                            />
                            
                             {/* Back Cover (roughly) */}
                             <div className="absolute inset-0 bg-slate-800 rounded-lg transform translate-z-[-40px]" />
                        </div>
                    </div>
                </motion.div>

                {/* Right: Actions & Stats */}
                <motion.div 
                     initial={{ x: 50, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: 0.4 }}
                     className="space-y-8"
                >
                    <Card className="border-2 border-primary/10 shadow-lg bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="space-y-1">
                                    <div className="text-2xl font-bold text-primary flex justify-center"><AlignLeft className="w-6 h-6" /></div>
                                    <p className="text-2xl font-bold">{state.book.chapters.length}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Chapters</p>
                                </div>
                                <div className="space-y-1 border-x border-border">
                                    <div className="text-2xl font-bold text-primary flex justify-center"><Clock className="w-6 h-6" /></div>
                                    <p className="text-2xl font-bold">~{calculateReadingTime()}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Mins Read</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-bold text-primary flex justify-center"><FileText className="w-6 h-6" /></div>
                                    <p className="text-2xl font-bold">{state.book.format}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Format</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-muted-foreground">Choose Format</label>
                                    <ToggleGroup
                                        type='single'
                                        value={state.book.format}
                                        onValueChange={(value) => {
                                            if (value) setBookFormat(value as 'PDF' | 'EPUB');
                                        }}
                                        className='w-full justify-start gap-2'
                                    >
                                        <ToggleGroupItem value='PDF' className='flex-1 border data-[state=on]:border-primary data-[state=on]:bg-primary/5'>
                                            <FileText className='h-4 w-4 mr-2' /> PDF
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value='EPUB' className='flex-1 border data-[state=on]:border-primary data-[state=on]:bg-primary/5'>
                                            <Book className='h-4 w-4 mr-2' /> EPUB
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                </div>

                                <Button
                                    onClick={handleDownload}
                                    disabled={isDownloading || state.book.chapters.length === 0}
                                    className={cn("w-full py-8 text-lg shadow-xl transition-all duration-300", downloadSuccess ? "bg-green-600 hover:bg-green-700" : "btn-primary hover:scale-[1.02]")}
                                >
                                    {isDownloading ? (
                                        <>
                                            <Loader2 className='h-5 w-5 mr-3 animate-spin' />
                                            Reading & Binding...
                                        </>
                                    ) : downloadSuccess ? (
                                        <>
                                            <CheckCircle2 className='h-6 w-6 mr-2' />
                                            Downloaded Successfully!
                                        </>
                                    ) : (
                                        <>
                                            <Download className='h-6 w-6 mr-2' />
                                            Download Book
                                        </>
                                    )}
                                </Button>
                                
                                <p className="text-xs text-center text-muted-foreground">
                                    Generated via ContentBookify Engine
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center px-2">
                        <Button
                            variant='ghost'
                            onClick={() => setCurrentStep('cover')}
                            className='hover:bg-transparent hover:text-primary transition-colors'
                        >
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Edit Cover
                        </Button>
                        <Button variant="ghost" size="icon" title="Share Project">
                            <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Button>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default PreviewDownloadStep;
