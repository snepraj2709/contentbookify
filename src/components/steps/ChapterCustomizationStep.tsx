
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, GripVertical, Save, Book, User, Clock, FileText } from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { Chapter } from '@/types/book.interface';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const ChapterCustomizationStep: React.FC = () => {
  const {
    state,
    updateChapter,
    reorderChapters,
    setCurrentStep,
    setBookTitle,
    setBookAuthor,
  } = useBook();
  
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  
  // Set first chapter as selected by default
  useEffect(() => {
    if (state.book.chapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(state.book.chapters[0].id);
    }
  }, [state.book.chapters, selectedChapterId]);

  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
  }>({
    title: '',
    description: '',
  });

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditForm({
      title: chapter.title,
      description: chapter.description,
    });
  };

  const handleSaveEdit = () => {
    if (editingChapterId) {
      updateChapter(editingChapterId, {
        title: editForm.title,
        description: editForm.description,
      });
      setEditingChapterId(null);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(state.book.chapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderChapters(items);
  };
  
  const selectedChapter = state.book.chapters.find(c => c.id === selectedChapterId);

  // Calculate stats
  const totalChapters = state.book.chapters.length;
  // Mock word count ~200 words/min
  const totalReadingTime = state.book.chapters.reduce((acc, curr) => {
      const words = curr.content.split(/\s+/).length;
      return acc + Math.ceil(words / 200);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className='w-full max-w-7xl mx-auto'
    >
      <div className='flex flex-col md:flex-row gap-8 h-[80vh]'>
        {/* Left Sidebar: Outline & Settings */}
        <div className='w-full md:w-1/3 flex flex-col gap-6 overflow-hidden'>
            <div className='space-y-4'>
                <h2 className='text-3xl font-serif font-bold tracking-tight text-primary'>Organize Book</h2>
                <div className='bg-card border rounded-lg p-4 space-y-3 shadow-sm'>
                    <div className='flex items-center gap-2'>
                        <Book className='w-4 h-4 text-muted-foreground' />
                        <Input 
                            value={state.book.title} 
                            onChange={(e) => setBookTitle(e.target.value)}
                            placeholder="Book Title"
                            className='font-serif font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent'
                        />
                    </div>
                    <div className='flex items-center gap-2'>
                        <User className='w-4 h-4 text-muted-foreground' />
                        <Input 
                            value={state.book.author} 
                            onChange={(e) => setBookAuthor(e.target.value)}
                            placeholder="Author Name"
                            className='text-sm border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent'
                        />
                    </div>
                    <div className='flex items-center gap-4 text-xs text-muted-foreground pt-2'>
                        <span className='flex items-center'><FileText className='w-3 h-3 mr-1'/> {totalChapters} Chapters</span>
                        <span className='flex items-center'><Clock className='w-3 h-3 mr-1'/> ~{totalReadingTime} min read</span>
                    </div>
                </div>
            </div>

            <div className='flex-1 overflow-y-auto pr-2'>
                <h3 className='text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider'>Chapters</h3>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId='chapters'>
                        {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className='space-y-2'
                        >
                            {state.book.chapters.map((chapter, index) => (
                            <Draggable
                                key={chapter.id}
                                draggableId={chapter.id}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className='group'
                                >
                                    <div 
                                        onClick={() => setSelectedChapterId(chapter.id)}
                                        className={cn(
                                            'bg-card border rounded-md transition-all duration-200 cursor-pointer hover:border-primary/50 flex items-center gap-2 overflow-hidden',
                                            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary rotate-1' : 'hover:shadow-sm',
                                            selectedChapterId === chapter.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''
                                        )}
                                    >
                                        <div
                                            {...provided.dragHandleProps}
                                            className='h-full px-2 py-4 flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors cursor-grab active:cursor-grabbing'
                                        >
                                            <GripVertical className='h-4 w-4' />
                                        </div>
                                        
                                        <div className='flex-1 py-3 pr-3 min-w-0'>
                                            <div className='flex items-center gap-2 mb-1'>
                                                <span className='text-xs font-mono text-muted-foreground w-5 shrink-0'>{index + 1}.</span>
                                                <span className='text-sm font-medium truncate'>{chapter.title}</span>
                                            </div>
                                            <p className='text-xs text-muted-foreground line-clamp-1 pl-7'>
                                                {chapter.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                )}
                            </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
            
             <div className='pt-4 flex justify-between gap-4'>
                <Button variant='outline' onClick={() => setCurrentStep('articles')} className='flex-1'>
                    <ArrowLeft className='h-4 w-4 mr-2' /> Back
                </Button>
                <Button onClick={() => setCurrentStep('cover')} className='flex-1 btn-primary'>
                    Next <ArrowRight className='h-4 w-4 ml-2' />
                </Button>
            </div>
        </div>

        {/* Right Panel: Preview */}
        <div className='hidden md:flex flex-1 bg-muted/30 rounded-xl border p-8 flex-col overflow-hidden relative'>
            <div className='absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none' />
            
            {selectedChapter ? (
                <div className='h-full overflow-y-auto pr-2 custom-scrollbar'>
                    <motion.div
                        key={selectedChapter.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className='bg-card shadow-lg p-8 max-w-2xl mx-auto min-h-full rounded-sm border'
                    >
                        <div className='mb-8 text-center'>
                             <span className='text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block'>Chapter {state.book.chapters.findIndex(c => c.id === selectedChapterId) + 1}</span>
                             {editingChapterId === selectedChapter.id ? (
                                 <div className='space-y-4'>
                                    <Input 
                                        value={editForm.title} 
                                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                        className='text-center font-serif text-3xl font-bold h-auto py-2'
                                        autoFocus
                                    />
                                    <Textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                        className='text-center text-muted-foreground'
                                    />
                                     <Button onClick={handleSaveEdit} className='w-full'>Save Changes</Button>
                                 </div>
                             ) : (
                                <div className='group relative cursor-pointer' onClick={() => handleEditChapter(selectedChapter)}>
                                    <h2 className='text-4xl font-serif font-bold text-foreground mb-4'>{selectedChapter.title}</h2>
                                    <p className='text-lg text-muted-foreground italic mb-6 max-w-md mx-auto'>
                                        {selectedChapter.description}
                                    </p>
                                    <div className='absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity'>
                                        <Button size='sm' variant='ghost'>Edit</Button>
                                    </div>
                                </div>
                             )}
                             <Separator className='w-16 mx-auto bg-primary/20' />
                        </div>

                        {selectedChapter.media && (
                             <div className='mb-8 rounded-lg overflow-hidden shadow-md'>
                                 <img src={selectedChapter.media} alt={selectedChapter.title} className='w-full h-auto object-cover' />
                             </div>
                        )}

                        <div 
                            className='prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed'
                            dangerouslySetInnerHTML={{ __html: selectedChapter.content.substring(0, 1000) + '...' }}
                        />
                        
                        <div className='mt-8 pt-8 border-t text-center text-sm text-muted-foreground'>
                            <p>End of preview</p>
                        </div>
                    </motion.div>
                </div>
            ) : (
                <div className='flex items-center justify-center h-full text-muted-foreground'>
                    <p>Select a chapter to preview</p>
                </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChapterCustomizationStep;
