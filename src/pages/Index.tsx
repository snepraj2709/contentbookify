
import React from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import BookCreator from '@/components/BookCreator';
import { BookOpen } from 'lucide-react';

const Index = () => {
  return (
    <Layout>
      <div className="py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="h-12 w-12 mr-4 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Blog to Book
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create beautiful books from your favorite articles with just a few clicks.
            Download instantly as PDF or EPUB.
          </p>
        </motion.div>
        
        <BookCreator />
      </div>
    </Layout>
  );
};

export default Index;
