
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { BookOpen, ArrowRight, Star, Users, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        {/* Hero Badge */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium inline-flex items-center gap-2"
        >
          <Star className="w-4 h-4 text-accent" fill="currentColor" />
          <span>The #1 Blog-to-Book Converter</span>
        </motion.div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-primary mb-6 max-w-4xl leading-tight">
          Turn Your Favorite Blogs <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
            into a Beautiful Book
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Curate, customize, and download your personal library. The perfect reading experience, designed by bubble, built for you.
        </p>

        {/* CTA */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            size="lg" 
            onClick={() => navigate('/create')}
            className="h-14 px-8 text-lg rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-xl shadow-secondary/20 transition-all duration-300"
          >
            Start Creating Your Book
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>

        {/* Social Proof */}
        <div className="mt-12 flex items-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 opacity-50" />
            <span>Join <strong>10,000+</strong> readers</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 opacity-50" />
            <span><strong>50,000+</strong> books created</span>
          </div>
        </div>

        {/* Visual Preview Placeholder */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-16 relative w-full max-w-4xl"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse" />
          <div className="relative rounded-2xl border border-white/20 bg-white/50 backdrop-blur-sm shadow-2xl overflow-hidden aspect-[16/9] flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-muted-foreground/50 text-sm mb-2 uppercase tracking-widest">Example Preview</p>
                <BookOpen className="w-24 h-24 text-primary/20 mx-auto" />
              </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Index;
