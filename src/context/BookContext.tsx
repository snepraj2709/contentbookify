
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Book, Chapter, BookCover, SessionState, StepType } from '@/types';
import { useToast } from "@/components/ui/use-toast";

// Default covers as templates
const DEFAULT_COVERS: BookCover[] = [
  {
    id: 'template-1',
    type: 'template',
    url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=987&q=80',
    name: 'Minimal White'
  },
  {
    id: 'template-2',
    type: 'template',
    url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=987&q=80',
    name: 'Library'
  },
  {
    id: 'template-3',
    type: 'template',
    url: 'https://images.unsplash.com/photo-1550399105-c4db5fb85c18?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80',
    name: 'Colorful Abstract'
  },
  {
    id: 'template-4',
    type: 'template',
    url: 'https://images.unsplash.com/photo-1623018035782-b269248df916?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
    name: 'Minimalist'
  },
];

// Initial state
const initialState: SessionState = {
  book: {
    title: 'My Book',
    author: 'Your Name',
    chapters: [],
    coverImage: null,
    format: 'PDF'
  },
  coversGenerated: 0,
  cachedCovers: [...DEFAULT_COVERS],
  currentStep: 'articles'
};

// Action types
type Action =
  | { type: 'ADD_ARTICLE'; payload: { url: string } }
  | { type: 'REMOVE_ARTICLE'; payload: { id: string } }
  | { type: 'UPDATE_CHAPTER'; payload: { id: string; updates: Partial<Chapter> } }
  | { type: 'REORDER_CHAPTERS'; payload: { chapters: Chapter[] } }
  | { type: 'SET_BOOK_TITLE'; payload: { title: string } }
  | { type: 'SET_BOOK_AUTHOR'; payload: { author: string } }
  | { type: 'SET_BOOK_FORMAT'; payload: { format: 'PDF' | 'EPUB' } }
  | { type: 'SET_BOOK_COVER'; payload: { cover: BookCover } }
  | { type: 'ADD_GENERATED_COVER'; payload: { cover: BookCover } }
  | { type: 'SET_CURRENT_STEP'; payload: { step: StepType } };

// Reducer
const bookReducer = (state: SessionState, action: Action): SessionState => {
  switch (action.type) {
    case 'ADD_ARTICLE':
      return {
        ...state,
        book: {
          ...state.book,
          chapters: [
            ...state.book.chapters,
            {
              id: uuidv4(),
              title: 'Loading...',
              description: 'Fetching article content...',
              url: action.payload.url,
              isLoading: true
            }
          ]
        }
      };
      
    case 'REMOVE_ARTICLE':
      return {
        ...state,
        book: {
          ...state.book,
          chapters: state.book.chapters.filter(chapter => chapter.id !== action.payload.id)
        }
      };
      
    case 'UPDATE_CHAPTER':
      return {
        ...state,
        book: {
          ...state.book,
          chapters: state.book.chapters.map(chapter => 
            chapter.id === action.payload.id
              ? { ...chapter, ...action.payload.updates }
              : chapter
          )
        }
      };
      
    case 'REORDER_CHAPTERS':
      return {
        ...state,
        book: {
          ...state.book,
          chapters: action.payload.chapters
        }
      };
      
    case 'SET_BOOK_TITLE':
      return {
        ...state,
        book: {
          ...state.book,
          title: action.payload.title
        }
      };
      
    case 'SET_BOOK_AUTHOR':
      return {
        ...state,
        book: {
          ...state.book,
          author: action.payload.author
        }
      };
      
    case 'SET_BOOK_FORMAT':
      return {
        ...state,
        book: {
          ...state.book,
          format: action.payload.format
        }
      };
      
    case 'SET_BOOK_COVER':
      return {
        ...state,
        book: {
          ...state.book,
          coverImage: action.payload.cover
        }
      };
      
    case 'ADD_GENERATED_COVER':
      return {
        ...state,
        coversGenerated: state.coversGenerated + 1,
        cachedCovers: [
          action.payload.cover,
          ...state.cachedCovers.filter(cover => cover.type !== 'generated' || cover.id !== action.payload.cover.id)
        ]
      };
      
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload.step
      };
      
    default:
      return state;
  }
};

// Context
interface BookContextType {
  state: SessionState;
  addArticle: (url: string) => void;
  removeArticle: (id: string) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  reorderChapters: (chapters: Chapter[]) => void;
  setBookTitle: (title: string) => void;
  setBookAuthor: (author: string) => void;
  setBookFormat: (format: 'PDF' | 'EPUB') => void;
  setBookCover: (cover: BookCover) => void;
  addGeneratedCover: (cover: BookCover) => void;
  setCurrentStep: (step: StepType) => void;
  canGenerateMoreCovers: boolean;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

// Provider component
export const BookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(bookReducer, initialState);
  const { toast } = useToast();
  
  const addArticle = (url: string) => {
    // Basic URL validation
    try {
      new URL(url);
      dispatch({ type: 'ADD_ARTICLE', payload: { url } });
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
    }
  };
  
  const removeArticle = (id: string) => {
    dispatch({ type: 'REMOVE_ARTICLE', payload: { id } });
  };
  
  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } });
  };
  
  const reorderChapters = (chapters: Chapter[]) => {
    dispatch({ type: 'REORDER_CHAPTERS', payload: { chapters } });
  };
  
  const setBookTitle = (title: string) => {
    dispatch({ type: 'SET_BOOK_TITLE', payload: { title } });
  };
  
  const setBookAuthor = (author: string) => {
    dispatch({ type: 'SET_BOOK_AUTHOR', payload: { author } });
  };
  
  const setBookFormat = (format: 'PDF' | 'EPUB') => {
    dispatch({ type: 'SET_BOOK_FORMAT', payload: { format } });
  };
  
  const setBookCover = (cover: BookCover) => {
    dispatch({ type: 'SET_BOOK_COVER', payload: { cover } });
  };
  
  const addGeneratedCover = (cover: BookCover) => {
    // Check if we've reached the generation limit
    if (state.coversGenerated >= 3) {
      toast({
        title: "Generation limit reached",
        description: "You can only generate 3 covers per session",
        variant: "destructive"
      });
      return;
    }
    
    dispatch({ type: 'ADD_GENERATED_COVER', payload: { cover } });
  };
  
  const setCurrentStep = (step: StepType) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: { step } });
  };
  
  const canGenerateMoreCovers = state.coversGenerated < 3;
  
  const contextValue: BookContextType = {
    state,
    addArticle,
    removeArticle,
    updateChapter,
    reorderChapters,
    setBookTitle,
    setBookAuthor,
    setBookFormat,
    setBookCover,
    addGeneratedCover,
    setCurrentStep,
    canGenerateMoreCovers
  };
  
  return (
    <BookContext.Provider value={contextValue}>
      {children}
    </BookContext.Provider>
  );
};

// Custom hook for using the context
export const useBook = () => {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context;
};
