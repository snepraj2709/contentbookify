import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ExternalLink, Loader2, BookOpen, Clipboard, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBook } from '@/context/BookContext';
import { fetchArticleContent, extractTitleFromUrl, generateChapterSummary } from '@/utils/articleUtils';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ArticleInputStep: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const { state, addArticle, removeArticle, updateChapter, setCurrentStep } = useBook();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Process articles that are in loading state
  useEffect(() => {
    const loadingChapters = state.book.chapters.filter(chapter => chapter.isLoading);
    
    const processArticles = async () => {
      if (loadingChapters.length > 0 && !isProcessing) {
        setIsProcessing(true);
        
        for (const chapter of loadingChapters) {
          try {
             const result = await fetchArticleContent(chapter.url);
          
            if ('error' in result) {
              updateChapter(chapter.id, {
                title: extractTitleFromUrl(chapter.url),
                description: `Failed to load article: ${result.error}`,
                isLoading: false,
                error: result.error
              });
              
              toast({
                title: "Failed to load article",
                description: result.error,
                variant: "destructive"
              });
            } else {
              // Use the extracted title from the article or fall back to URL-based title
              const title = result.title || extractTitleFromUrl(chapter.url);
              // Mock reading time based on content length (approx 200 words per minute)
              const wordCount = result.content.split(/\s+/).length;
              const readingTime = Math.ceil(wordCount / 200);
              
              const summary = await generateChapterSummary(title, result.content);
              
              updateChapter(chapter.id, {
                title,
                description: summary,
                content: result.content,
                media: result.media, // Assuming media contains an image URL if available
                isLoading: false
              });
              
              toast({
                title: "Article loaded",
                description: `Successfully extracted content from ${title} (${readingTime} min read)`
              });
            }
          } catch (e) {
            console.error(e);
             updateChapter(chapter.id, {
                title: extractTitleFromUrl(chapter.url),
                description: "An unexpected error occurred",
                isLoading: false,
                error: "Unknown error"
              });
          }
        }
        
        setIsProcessing(false);
      }
    };
    
    processArticles();
  }, [state.book.chapters, updateChapter, toast, isProcessing]);
  
  const handlePaste = async () => {
    setIsPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        toast({
          title: "URL Pasted",
          description: "Link pasted from clipboard",
        });
      }
    } catch (err) {
      toast({
        title: "Paste Failed",
        description: "Could not access clipboard. Please paste manually.",
        variant: "destructive"
      });
    } finally {
      setIsPasting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      // Basic URL validation
      try {
        new URL(url.trim());
        addArticle(url.trim());
        setUrl('');
      } catch (e) {
        toast({
            title: "Invalid URL",
            description: "Please enter a valid website address (e.g., https://example.com)",
            variant: "destructive"
        });
      }
    }
  };
  
  const handleContinue = () => {
    if (state.book.chapters.length === 0) {
      toast({
        title: "No blogs added",
        description: "Please add at least one article to continue",
        variant: "destructive"
      });
      return;
    }
    
    if (state.book.chapters.some(chapter => chapter.isLoading)) {
      toast({
        title: "Blogs still loading",
        description: "Please wait until all blogs have finished loading",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep('chapters');
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold tracking-tight text-primary">Your Reading Collection</h2>
        <p className="text-muted-foreground mt-2">
          Add articles from your favorite blogs to build your book.
        </p>
      </div>
      
      {/* Input Area */}
      <Card className="mb-10 border-dashed border-2 hover:border-primary/20 transition-colors shadow-none bg-accent/5">
        <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <LinkIcon className="h-5 w-5" />
                    </div>
                    <Input
                        type="url"
                        placeholder="Paste blog URL here..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pl-10 h-12 text-lg bg-background shadow-sm border-input"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                         <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={handlePaste}
                            disabled={isPasting}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground md:w-auto md:px-3 md:py-1 md:h-8"
                        >
                           <Clipboard className="h-4 w-4 md:mr-2" />
                           <span className="hidden md:inline">Paste</span>
                        </Button>
                    </div>
                </div>
                <Button type="submit" size="lg" className="h-12 px-8 btn-primary font-medium">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Article
                </Button>
            </form>
             <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-background/50 p-2 rounded-md inline-flex border border-border/50">
                  <AlertCircle className="h-4 w-4 text-secondary" />
                  <span>Tip: Add 5-10 articles for a perfect weekend read.</span>
             </div>
        </CardContent>
      </Card>
      
      {/* Article List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {state.book.chapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center p-16 text-center border rounded-2xl bg-muted/20"
            >
              <div className="rounded-full bg-background p-6 shadow-sm mb-6">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Your book starts here</h3>
              <p className="text-muted-foreground max-w-sm">
                Paste your first URL above to begin curating your personal anthology.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1">
              {state.book.chapters.map((chapter, index) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  layout
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-border group-hover:border-primary/20">
                    <div className="flex flex-col sm:flex-row">
                        {/* Thumbnail / Number */}
                        <div className="w-full sm:w-48 h-32 sm:h-auto bg-muted shrink-0 flex items-center justify-center relative overflow-hidden">
                           {chapter.media ? (
                               <img src={chapter.media} alt={chapter.title} className="w-full h-full object-cover" />
                           ) : (
                               <div className="text-6xl font-serif font-bold text-muted-foreground/20">
                                   {index + 1}
                               </div>
                           )}
                           {/* Overlay for quick actions could go here */}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-serif text-xl font-semibold text-foreground line-clamp-1 mb-1">
                                        {chapter.isLoading ? (
                                            <div className="h-7 w-48 bg-muted animate-pulse rounded" />
                                        ) : (
                                            chapter.title
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        {chapter.isLoading ? (
                                            <span className="flex items-center text-secondary">
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Fetching content...
                                            </span>
                                        ) : (
                                           <>
                                             <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                                Ready
                                             </span>
                                             <span>•</span>
                                             <span>{new URL(chapter.url).hostname}</span>
                                           </>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeArticle(chapter.id)}
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                 <p className="text-sm text-muted-foreground line-clamp-2 max-w-xl">
                                    {chapter.description || "No description available."}
                                 </p>
                                 <a 
                                    href={chapter.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:flex items-center text-xs font-medium text-primary hover:underline"
                                 >
                                    Original Post <ExternalLink className="h-3 w-3 ml-1" />
                                 </a>
                            </div>
                        </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Actions */}
      <div className="mt-10 flex justify-end">
        <Button 
          size="lg"
          onClick={handleContinue}
          disabled={state.book.chapters.length === 0 || state.book.chapters.some(chapter => chapter.isLoading)}
          className="px-8 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black shadow-xl"
        >
          Organize Chapters
        </Button>
      </div>
    </motion.div>
  );
};

export default ArticleInputStep;
