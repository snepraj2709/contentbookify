import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBook } from '@/context/BookContext';
import { fetchArticleContent, extractTitleFromUrl, generateChapterSummary } from '@/utils/articleUtils';
import { useToast } from '@/components/ui/use-toast';

const ArticleInputStep: React.FC = () => {
  const [url, setUrl] = useState('');
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
            const summary = await generateChapterSummary(title, result.content);
            
            updateChapter(chapter.id, {
              title,
              description: summary,
              content: result.content,
              media: result.media,
              isLoading: false
            });
            
            toast({
              title: "Article loaded",
              description: `Successfully extracted content from ${title}`
            });
          }
        }
        
        setIsProcessing(false);
      }
    };
    
    processArticles();
  }, [state.book.chapters, updateChapter, toast, isProcessing]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      addArticle(url.trim());
      setUrl('');
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
    
    // Check if any articles are still loading
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
      className="w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Step 1: Add Blogs</h2>
        <p className="text-muted-foreground mt-2">
          Enter the URLs of blogs you want to include in your book
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3 items-center max-w-2xl mx-auto">
          <Input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" variant="default" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>
      
      <div className="max-w-3xl mx-auto mb-8">
        <AnimatePresence>
          {state.book.chapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center p-12"
            >
              <p className="text-muted-foreground">
                No Blogs added yet. Enter blog URLs above to begin creating your book.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {state.book.chapters.map((chapter, index) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center">
                          <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <div className="truncate max-w-[150px] sm:max-w-[300px]">
                            {chapter.isLoading ? (
                              <span className="flex items-center text-muted-foreground">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </span>
                            ) : (
                              <span className={chapter.error ? "text-destructive" : ""}>
                                {chapter.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={chapter.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeArticle(chapter.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {chapter.isLoading ? (
                            <span className="flex items-center">
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Extracting content...
                            </span>
                          ) : chapter.error ? (
                            <span className="text-destructive">{chapter.description}</span>
                          ) : (
                            chapter.description
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-end max-w-3xl mx-auto">
        <Button 
          onClick={handleContinue}
          disabled={state.book.chapters.length === 0 || state.book.chapters.some(chapter => chapter.isLoading)}
          className="px-6"
        >
          Continue to Customize Chapters
        </Button>
      </div>
    </motion.div>
  );
};

export default ArticleInputStep;
