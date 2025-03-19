
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Book, Download, FileText, Loader2 } from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/components/ui/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const PreviewDownloadStep: React.FC = () => {
  const { state, setBookFormat, setCurrentStep } = useBook();
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  
  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // In a real implementation, this would call a backend API to generate the book
      // For now, we'll simulate with a timeout
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Book Created",
        description: `Your ${state.book.format} book has been successfully created and downloaded.`
      });
      
      // Simulate file download by creating a text file
      const element = document.createElement('a');
      const fileType = state.book.format === 'PDF' ? 'pdf' : 'epub';
      const fileName = `${state.book.title.replace(/\s+/g, '-').toLowerCase()}.${fileType}`;
      
      // In a real app, this would be a blob URL to the actual file
      // For this example, we're just creating a text file with info about the book
      const bookInfo = `
        Title: ${state.book.title}
        Author: ${state.book.author}
        Format: ${state.book.format}
        Chapters: ${state.book.chapters.length}
        
        Table of Contents:
        ${state.book.chapters.map((chapter, index) => `${index + 1}. ${chapter.title}`).join('\n')}
        
        Note: This is a simulated download. In a real app, this would be an actual ${state.book.format} file.
      `;
      
      const file = new Blob([bookInfo], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error creating your book. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Step 4: Preview & Download</h2>
        <p className="text-muted-foreground mt-2">
          Review your book and download it in your preferred format
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Book Preview</h3>
          
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {state.book.coverImage && (
                  <div className="hidden sm:block w-32 h-48 shrink-0">
                    <img 
                      src={state.book.coverImage.url} 
                      alt="Book cover" 
                      className="w-full h-full object-cover rounded-md shadow-md"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h4 className="text-xl font-bold">{state.book.title}</h4>
                  <p className="text-muted-foreground mb-4">By {state.book.author}</p>
                  
                  <div className="space-y-1">
                    <p className="text-sm"><strong>Chapters:</strong> {state.book.chapters.length}</p>
                    <p className="text-sm"><strong>Format:</strong> {state.book.format}</p>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Table of Contents</h5>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      {state.book.chapters.map((chapter) => (
                        <li key={chapter.id} className="truncate">
                          {chapter.title}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Download Options</h3>
          
          <Card>
            <CardContent className="p-6 flex flex-col gap-4">
              <div>
                <h4 className="font-medium mb-2">Select Format</h4>
                <ToggleGroup 
                  type="single" 
                  value={state.book.format}
                  onValueChange={(value) => {
                    if (value) setBookFormat(value as 'PDF' | 'EPUB');
                  }}
                  className="w-full"
                >
                  <ToggleGroupItem value="PDF" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </ToggleGroupItem>
                  <ToggleGroupItem value="EPUB" className="flex-1">
                    <Book className="h-4 w-4 mr-2" />
                    EPUB
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              <div className="mt-4">
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-6"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating your {state.book.format} book...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download {state.book.format}
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-2 text-sm text-muted-foreground text-center">
                <p>Your book will be saved to your downloads folder</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <h4 className="font-medium mb-2">Book Details</h4>
            <div className="text-sm space-y-2">
              <div className="flex">
                <span className="w-24 font-medium">Title:</span>
                <span>{state.book.title}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-medium">Author:</span>
                <span>{state.book.author}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-medium">Chapters:</span>
                <span>{state.book.chapters.length}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-medium">Cover:</span>
                <span>
                  {state.book.coverImage?.type === 'upload' 
                    ? 'Custom Upload' 
                    : state.book.coverImage?.type === 'template'
                      ? 'Template'
                      : 'AI Generated'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between max-w-6xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('cover')}
          className="px-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </motion.div>
  );
};

export default PreviewDownloadStep;
