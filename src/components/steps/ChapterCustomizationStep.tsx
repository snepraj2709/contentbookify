
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, GripVertical, Save } from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { Chapter } from '@/types';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ChapterCustomizationStep: React.FC = () => {
  const { state, updateChapter, reorderChapters, setCurrentStep, setBookTitle, setBookAuthor } = useBook();
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string }>({
    title: '',
    description: ''
  });
  
  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditForm({
      title: chapter.title,
      description: chapter.description
    });
  };
  
  const handleSaveEdit = () => {
    if (editingChapterId) {
      updateChapter(editingChapterId, {
        title: editForm.title,
        description: editForm.description
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Step 2: Customize Your Chapters</h2>
        <p className="text-muted-foreground mt-2">
          Rearrange chapters and edit their titles and descriptions
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto mb-8">
        
        <h3 className="text-lg font-medium mb-4">Arrange and Edit Chapters</h3>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="chapters">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {state.book.chapters.map((chapter, index) => (
                  <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="chapter-card"
                      >
                        <Card className="overflow-hidden">
                          <CardContent className="p-0">
                            {editingChapterId === chapter.id ? (
                              <div className="p-4 space-y-3">
                                <Input
                                  value={editForm.title}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  placeholder="Chapter title"
                                />
                                <Textarea
                                  value={editForm.description}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  placeholder="Chapter description"
                                  rows={3}
                                />
                                <div className="flex justify-end">
                                  <Button 
                                    onClick={handleSaveEdit} 
                                    size="sm"
                                    className="flex items-center gap-1"
                                  >
                                    <Save className="h-4 w-4" />
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-stretch">
                                <div 
                                  className="p-3 flex items-center justify-center bg-muted/30" 
                                  {...provided.dragHandleProps}
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 p-4">
                                  <div className="flex items-center mb-2">
                                    <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">
                                      {index + 1}
                                    </div>
                                    <h4 className="font-medium">{chapter.title}</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {chapter.description}
                                  </p>
                                </div>
                                <div className="p-4 flex items-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditChapter(chapter)}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
         <div className="mb-6 space-y-4">
          <div>
            <label htmlFor="bookTitle" className="block text-sm font-medium mb-1">
              Book Title
            </label>
            <Input
              id="bookTitle"
              value={state.book.title}
              onChange={(e) => setBookTitle(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div>
            <label htmlFor="bookAuthor" className="block text-sm font-medium mb-1">
              Author Name
            </label>
            <Input
              id="bookAuthor"
              value={state.book.author}
              onChange={(e) => setBookAuthor(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between max-w-3xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('articles')}
          className="px-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={() => setCurrentStep('cover')}
          className="px-6"
        >
          Continue to Design Cover
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};

export default ChapterCustomizationStep;
