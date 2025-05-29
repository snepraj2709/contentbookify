/** @format */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Upload, Wand2, Loader2 } from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { BookCover } from '@/types/book.interface';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CoverDesignStep: React.FC = () => {
  const {
    state,
    setBookCover,
    addGeneratedCover,
    setCurrentStep,
    canGenerateMoreCovers,
  } = useBook();
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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
      // Call the Gemini edge function to generate a cover
      const { data, error } = await supabase.functions.invoke('gemini', {
        body: {
          action: 'generateCoverImage',
          data: {
            prompt: promptText,
            title: state.book.title,
            author: state.book.author,
          },
        },
      });

      if (error) {
        console.error('Error invoking Gemini function:', error);
        throw error;
      }

      // In a real implementation, we would use the generated image URL
      // For now, we'll use a random placeholder since we're not actually generating images
      const randomImageID = Math.floor(Math.random() * 1000);
      const newCover: BookCover = {
        id: uuidv4(),
        type: 'generated',
        url: `https://picsum.photos/seed/${randomImageID}/800/1200`,
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
      // Create URL for the uploaded file
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

  const handleSelectTemplate = (cover: BookCover) => {
    setBookCover(cover);

    toast({
      title: 'Template selected',
      description: `Selected template: ${cover.name}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className='w-full'
    >
      <div className='text-center mb-8'>
        <h2 className='text-3xl font-bold tracking-tight'>
          Step 3: Design Your Book Cover
        </h2>
        <p className='text-muted-foreground mt-2'>
          Choose a template, upload your own, or generate a cover with AI
        </p>
      </div>

      <div className='grid md:grid-cols-[1fr_1.5fr] gap-8 max-w-6xl mx-auto mb-8'>
        <div>
          <h3 className='text-lg font-medium mb-4'>Cover Options</h3>

          <div className='space-y-6'>
            {/* Upload */}
            <Card>
              <CardContent className='p-4'>
                <h4 className='font-medium mb-2'>Upload Your Own Cover</h4>
                <p className='text-sm text-muted-foreground mb-3'>
                  Upload a custom image for your book cover
                </p>
                <div className='flex items-center gap-2'>
                  <Input
                    type='file'
                    accept='image/*'
                    id='cover-upload'
                    className='hidden'
                    onChange={handleFileUpload}
                  />
                  <label htmlFor='cover-upload'>
                    <Button
                      variant='outline'
                      className='cursor-pointer'
                      asChild
                    >
                      <span>
                        <Upload className='h-4 w-4 mr-2' />
                        Upload Image
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Generate */}
            <Card>
              <CardContent className='p-4'>
                <h4 className='font-medium mb-2'>Generate with AI</h4>
                <p className='text-sm text-muted-foreground mb-3'>
                  Describe your ideal cover and let AI generate it
                  {canGenerateMoreCovers
                    ? ` (${3 - state.coversGenerated} generations remaining)`
                    : ' (No generations remaining)'}
                </p>
                <div className='space-y-3'>
                  <Textarea
                    placeholder='Describe your ideal book cover...'
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    disabled={!canGenerateMoreCovers || isGenerating}
                    rows={3}
                  />
                  <Button
                    onClick={handleGenerateCover}
                    disabled={
                      !canGenerateMoreCovers ||
                      isGenerating ||
                      !promptText.trim()
                    }
                    className='w-full'
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className='h-4 w-4 mr-2' />
                        Generate Cover
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Templates */}
            <Card>
              <CardContent className='p-4'>
                <h4 className='font-medium mb-2'>Choose a Template</h4>
                <p className='text-sm text-muted-foreground mb-3'>
                  Select from our pre-designed cover templates
                </p>
                <div className='grid grid-cols-2 gap-3'>
                  {state.cachedCovers.map((cover) => (
                    <div
                      key={cover.id}
                      className={`
                        relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer
                        transition-all duration-200
                        ${
                          state.book.coverImage?.id === cover.id
                            ? 'ring-4 ring-primary/50 ring-offset-2'
                            : 'hover:scale-[1.02]'
                        }
                      `}
                      onClick={() => handleSelectTemplate(cover)}
                    >
                      <img
                        src={cover.url}
                        alt={cover.name || 'Book cover template'}
                        className='w-full h-full object-cover'
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h3 className='text-lg font-medium mb-4'>Cover Preview</h3>
          <AnimatePresence mode='wait'>
            {state.book.coverImage ? (
              <motion.div
                key={state.book.coverImage.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className='max-w-xs mx-auto'
              >
                <div className='relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl'>
                  <img
                    src={state.book.coverImage.url}
                    alt='Book cover preview'
                    className='w-full h-full object-cover'
                  />

                  <div className='absolute inset-0 bg-gradient-to-b from-black/10 to-black/60 flex flex-col justify-end p-6'>
                    <h2 className='text-white text-2xl font-bold mb-1'>
                      {state.book.title}
                    </h2>
                    <p className='text-white/90 text-sm'>
                      By {state.book.author}
                    </p>
                  </div>
                </div>

                {state.book.coverImage.name && (
                  <p className='text-center text-sm text-muted-foreground mt-3'>
                    {state.book.coverImage.type === 'template'
                      ? 'Template: '
                      : state.book.coverImage.type === 'upload'
                      ? 'Uploaded: '
                      : state.book.coverImage.type === 'generated'
                      ? 'Generated: '
                      : ''}
                    {state.book.coverImage.name}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='flex flex-col items-center justify-center h-80 bg-muted/30 rounded-lg border border-dashed'
              >
                <p className='text-muted-foreground'>
                  Select or upload a cover to see preview
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className='flex justify-between max-w-6xl mx-auto'>
        <Button
          variant='outline'
          onClick={() => setCurrentStep('chapters')}
          className='px-6'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep('preview')}
          disabled={!state.book.coverImage}
          className='px-6'
        >
          Continue to Preview
          <ArrowRight className='h-4 w-4 ml-2' />
        </Button>
      </div>
    </motion.div>
  );
};

export default CoverDesignStep;
