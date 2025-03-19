
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookProvider, useBook } from '@/context/BookContext';
import ArticleInputStep from './steps/ArticleInputStep';
import ChapterCustomizationStep from './steps/ChapterCustomizationStep';
import CoverDesignStep from './steps/CoverDesignStep';
import PreviewDownloadStep from './steps/PreviewDownloadStep';
import Stepper from './Stepper';

const BookCreatorContent: React.FC = () => {
  const { state } = useBook();
  const { currentStep } = state;
  
  return (
    <div className="w-full">
      <Stepper />
      
      <AnimatePresence mode="wait">
        {currentStep === 'articles' && <ArticleInputStep key="articles" />}
        {currentStep === 'chapters' && <ChapterCustomizationStep key="chapters" />}
        {currentStep === 'cover' && <CoverDesignStep key="cover" />}
        {currentStep === 'preview' && <PreviewDownloadStep key="preview" />}
      </AnimatePresence>
    </div>
  );
};

const BookCreator: React.FC = () => {
  return (
    <BookProvider>
      <BookCreatorContent />
    </BookProvider>
  );
};

export default BookCreator;
