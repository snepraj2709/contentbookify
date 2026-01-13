
import React from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import BookCreator from '@/components/BookCreator';

const Create = () => {
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BookCreator />
      </motion.div>
    </Layout>
  );
};

export default Create;
