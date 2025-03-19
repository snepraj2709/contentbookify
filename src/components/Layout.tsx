
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "min-h-screen w-full bg-gradient-to-b from-background to-secondary/30 flex flex-col items-center",
        className
      )}
    >
      <div className="w-full max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {children}
      </div>
    </motion.div>
  );
};

export default Layout;
