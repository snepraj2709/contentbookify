
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    ArrowRight,
    Upload,
    Wand2,
    Loader2,
    LayoutTemplate,
    Palette,
    Image as ImageIcon
} from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { BookCover } from '@/types/book.interface';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const CoverDesignStep: React.FC = () => {
    const {
        state,
        setBookCover,
        addGeneratedCover,
        setCurrentStep,
        canGenerateMoreCovers,
        setBookTitle,
        setBookSubtitle,
        setBookAuthor,
        updateCoverOptions
    } = useBook();

    const [promptText, setPromptText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    // Helper to get text alignment class
    const getTextAlign = (align: string | undefined) => {
        switch (align) {
            case 'left': return 'text-left items-start';
            case 'right': return 'text-right items-end';
            default: return 'text-center items-center';
        }
    };

    // Helper to get font family class
    const getFontFamily = (font: string | undefined) => {
        switch (font) {
            case 'sans': return 'font-sans';
            case 'display': return 'font-sans tracking-tight'; // Using sans as proxy for display if not custom
            default: return 'font-serif';
        }
    };

    const handleGenerateCover = async () => {
        if (!promptText.trim()) {
            toast({
                title: 'Empty prompt',
                description: 'Please enter a description for your cover',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);

        try {
            // Call the Python backend to generate a cover
            const backendUrl = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl.replace(/\/$/, '')}/generate-cover/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: promptText
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate cover');
            }

            const data = await response.json();
            
            const newCover: BookCover = {
                id: uuidv4(),
                type: 'generated',
                url: data.cover_url,
                name: `Generated from: ${promptText.substring(0, 20)}...`,
            };

            addGeneratedCover(newCover);
            setBookCover(newCover);
            setPromptText('');

            toast({
                title: 'Cover generated',
                description: `${3 - (state.coversGenerated + 1)} generations remaining`,
            });
        } catch (error) {
            console.error('Cover generation error:', error);
            toast({
                title: 'Generation failed',
                description: 'Failed to generate cover image',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const fileUrl = URL.createObjectURL(file);
            const newCover: BookCover = {
                id: uuidv4(),
                type: 'upload',
                url: fileUrl,
                name: file.name,
            };

            setBookCover(newCover);

            toast({
                title: 'Cover uploaded',
                description: 'Your custom cover has been set',
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='w-full max-w-7xl mx-auto lg:h-[85vh] h-auto flex flex-col'
        >
            <div className='flex items-center justify-between mb-6 shrink-0'>
                <div>
                    <h2 className='text-3xl font-bold tracking-tight'>Design Cover</h2>
                    <p className='text-muted-foreground'>Create a stunning cover for your book</p>
                </div>
                <div className='flex gap-3'>
                    <Button variant='outline' onClick={() => setCurrentStep('chapters')}>
                        <ArrowLeft className='h-4 w-4 mr-2' /> Back
                    </Button>
                    <Button onClick={() => setCurrentStep('preview')} disabled={!state.book.coverImage}>
                        Preview & Download <ArrowRight className='h-4 w-4 ml-2' />
                    </Button>
                </div>
            </div>

            <div className='flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0'>
                {/* LEFT PANEL: RESOURCES */}
                <Card className='lg:col-span-3 flex flex-col h-auto min-h-[400px] lg:h-auto lg:overflow-hidden'>
                    <Tabs defaultValue="templates" className="flex-1 flex flex-col">
                        <div className="p-4 border-b">
                            <TabsList className="w-full grid grid-cols-3">
                                <TabsTrigger value="templates" title="Templates"><LayoutTemplate className="h-4 w-4" /></TabsTrigger>
                                <TabsTrigger value="ai" title="AI Gen"><Wand2 className="h-4 w-4" /></TabsTrigger>
                                <TabsTrigger value="upload" title="Upload"><Upload className="h-4 w-4" /></TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4">
                            <TabsContent value="templates" className="mt-0 space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Library</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {state.cachedCovers.filter(c => c.type !== 'generated' && c.type !== 'upload').map((cover) => (
                                        <div
                                            key={cover.id}
                                            className={cn(
                                                "aspect-[2/3] rounded-md overflow-hidden cursor-pointer border-2 transition-all hover:scale-105",
                                                state.book.coverImage?.id === cover.id ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                            )}
                                            onClick={() => setBookCover(cover)}
                                        >
                                            <img src={cover.url} alt={cover.name} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="ai" className="mt-0 space-y-4">
                                <div className="space-y-4">
                                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                        <Label>AI Prompt</Label>
                                        <Textarea 
                                            placeholder="Describe a mystical forest landscape..." 
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            rows={3}
                                            className="resize-none bg-background"
                                        />
                                        <Button 
                                            onClick={handleGenerateCover} 
                                            disabled={isGenerating || !canGenerateMoreCovers}
                                            className="w-full"
                                        >
                                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                                            Generate
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground">
                                            {state.coversGenerated}/3 free generations used
                                        </p>
                                    </div>
                                    
                                    {state.cachedCovers.some(c => c.type === 'generated') && (
                                        <>
                                            <div className="h-px bg-border my-4" />
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Generated</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                 {state.cachedCovers.filter(c => c.type === 'generated').map((cover) => (
                                                    <div
                                                        key={cover.id}
                                                        className={cn(
                                                            "aspect-[2/3] rounded-md overflow-hidden cursor-pointer border-2 transition-all hover:scale-105",
                                                            state.book.coverImage?.id === cover.id ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                                        )}
                                                        onClick={() => setBookCover(cover)}
                                                    >
                                                        <img src={cover.url} alt="Generated cover" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="upload" className="mt-0">
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:bg-muted/50 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="cover-upload-panel"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <label htmlFor="cover-upload-panel" className="cursor-pointer flex flex-col items-center gap-3">
                                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Click to upload</p>
                                            <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                                        </div>
                                    </label>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </Card>

                {/* CENTER PANEL: PREVIEW */}
                <div className='lg:col-span-6 flex items-center justify-center bg-muted/30 rounded-xl relative overflow-hidden p-8 min-h-[400px] lg:min-h-0'>
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
                    
                    {state.book.coverImage ? (
                         <motion.div 
                            layoutId="book-cover-preview"
                            className="relative w-full max-w-[400px] aspect-[2/3] rounded-r-2xl rounded-l-sm shadow-2xl overflow-hidden group perspective-1000"
                            style={{ boxShadow: '20px 20px 60px -10px rgba(0,0,0,0.4), inset 2px 0 5px rgba(255,255,255,0.7)' }}
                         >
                            {/* Spine Effect */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white/40 to-black/20 z-20 pointer-events-none" />
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-black/10 z-20 pointer-events-none" />
                            
                            {/* Image Background */}
                            <img 
                                src={state.book.coverImage.url} 
                                alt="Cover" 
                                className="absolute inset-0 w-full h-full object-cover z-0" 
                            />
                            
                            {/* Overlay for tinting if needed (future feature) */}
                            <div className="absolute inset-0 z-0 bg-black/20" />

                            {/* Text Layer */}
                            <div className={cn(
                                "absolute inset-0 z-10 p-8 flex flex-col justify-end transition-all duration-300",
                                getTextAlign(state.book.coverOptions?.layout)
                            )}>
                                <div className={cn(
                                    "w-full space-y-2",
                                    state.book.coverOptions?.layout === 'center' ? 'text-center' : 
                                    state.book.coverOptions?.layout === 'right' ? 'text-right' : 'text-left'
                                )}>
                                    <h1 
                                        className={cn("text-4xl font-bold leading-tight drop-shadow-lg", getFontFamily(state.book.coverOptions?.fontFamily))}
                                        style={{ color: state.book.coverOptions?.titleColor }}
                                    >
                                        {state.book.title}
                                    </h1>
                                    {state.book.subtitle && (
                                        <p 
                                            className="text-lg font-medium drop-shadow-md opacity-90"
                                            style={{ color: state.book.coverOptions?.subtitleColor }}
                                        >
                                            {state.book.subtitle}
                                        </p>
                                    )}
                                    <div className="pt-8 pb-4">
                                        <p 
                                            className="text-sm tracking-widest uppercase font-semibold drop-shadow-md"
                                            style={{ color: state.book.coverOptions?.authorColor }}
                                        >
                                            {state.book.author}
                                        </p>
                                    </div>
                                </div>
                            </div>
                         </motion.div>
                    ) : (
                        <div className="text-center p-12 border-2 border-dashed rounded-xl bg-background/50 backdrop-blur-sm">
                            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No cover selected</h3>
                            <p className="text-muted-foreground">Choose a template from the left to get started</p>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL: CUSTOMIZATION */}
                <Card className='lg:col-span-3 flex flex-col h-auto min-h-[400px] lg:h-auto lg:overflow-hidden'>
                    <div className="p-4 border-b bg-muted/10">
                        <h3 className="font-semibold flex items-center gap-2"><Palette className="h-4 w-4" /> Customization</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Text Content */}
                        <div className="space-y-3">
                            <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Content</Label>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="title-input" className="text-xs">Title</Label>
                                    <Input 
                                        id="title-input" 
                                        value={state.book.title} 
                                        onChange={(e) => setBookTitle(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="subtitle-input" className="text-xs">Subtitle</Label>
                                    <Input 
                                        id="subtitle-input" 
                                        value={state.book.subtitle || ''} 
                                        onChange={(e) => setBookSubtitle(e.target.value)} 
                                        placeholder="Optional subtitle"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="author-input" className="text-xs">Author</Label>
                                    <Input 
                                        id="author-input" 
                                        value={state.book.author} 
                                        onChange={(e) => setBookAuthor(e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border" />

                        {/* Typography */}
                        <div className="space-y-3">
                            <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Typography</Label>
                            
                             <RadioGroup 
                                value={state.book.coverOptions?.fontFamily} 
                                onValueChange={(val) => updateCoverOptions({ fontFamily: val as any })}
                                className="grid grid-cols-3 gap-2"
                             >
                                <div>
                                    <RadioGroupItem value="serif" id="font-serif" className="peer sr-only" />
                                    <Label
                                        htmlFor="font-serif"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        <span className="font-serif text-xl">Aa</span>
                                        <span className="text-[10px]">Serif</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="sans" id="font-sans" className="peer sr-only" />
                                    <Label
                                        htmlFor="font-sans"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        <span className="font-sans text-xl">Aa</span>
                                        <span className="text-[10px]">Sans</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="display" id="font-display" className="peer sr-only" />
                                    <Label
                                        htmlFor="font-display"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        <span className="font-sans tracking-tighter font-black text-xl">Aa</span>
                                        <span className="text-[10px]">Bold</span>
                                    </Label>
                                </div>
                            </RadioGroup>

                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => updateCoverOptions({ layout: 'left' })}
                                    className={cn(state.book.coverOptions?.layout === 'left' && "bg-primary/10 border-primary")}
                                >
                                    Left
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => updateCoverOptions({ layout: 'center' })}
                                    className={cn(state.book.coverOptions?.layout === 'center' && "bg-primary/10 border-primary")}
                                >
                                    Center
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => updateCoverOptions({ layout: 'right' })}
                                    className={cn(state.book.coverOptions?.layout === 'right' && "bg-primary/10 border-primary")}
                                >
                                    Right
                                </Button>
                            </div>
                        </div>

                         <div className="h-px bg-border" />

                         {/* Colors */}
                         <div className="space-y-3">
                             <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Text Colors</Label>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <Label className="text-xs">Title</Label>
                                     <div className="flex items-center gap-2">
                                         <input 
                                             type="color" 
                                             value={state.book.coverOptions?.titleColor}
                                             onChange={(e) => updateCoverOptions({ titleColor: e.target.value })}
                                             className="h-8 w-8 rounded overflow-hidden cursor-pointer border p-0"
                                         />
                                         <span className="text-xs font-mono text-muted-foreground">{state.book.coverOptions?.titleColor}</span>
                                     </div>
                                 </div>
                                 <div className="space-y-1">
                                     <Label className="text-xs">Subtitle</Label>
                                     <div className="flex items-center gap-2">
                                         <input 
                                             type="color" 
                                             value={state.book.coverOptions?.subtitleColor}
                                             onChange={(e) => updateCoverOptions({ subtitleColor: e.target.value })}
                                             className="h-8 w-8 rounded overflow-hidden cursor-pointer border p-0"
                                         />
                                          <span className="text-xs font-mono text-muted-foreground">{state.book.coverOptions?.subtitleColor}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
};

export default CoverDesignStep;
