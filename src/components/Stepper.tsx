/** @format */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useBook } from '@/context/BookContext';
import { StepType } from '@/types/book.interface';
import { CheckIcon } from 'lucide-react';

interface StepperProps {
  className?: string;
}

const Stepper: React.FC<StepperProps> = ({ className }) => {
  const { state, setCurrentStep } = useBook();
  const { currentStep } = state;

  const steps: { id: StepType; label: string }[] = [
    { id: 'articles', label: 'Add Content' },
    { id: 'chapters', label: 'Organize Chapters' },
    { id: 'cover', label: 'Design Cover' },
    { id: 'preview', label: 'Preview & Download' },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const handleStepClick = (stepId: StepType, index: number) => {
    // Only allow navigating to completed steps or the next step
    if (index <= currentStepIndex || index === currentStepIndex + 1) {
      setCurrentStep(stepId);
    }
  };

  return (
    <div className={cn('w-full py-6', className)}>
      <div className='flex items-center justify-between w-full max-w-3xl mx-auto'>
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable =
            index <= currentStepIndex || index === currentStepIndex + 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <motion.button
                onClick={() => handleStepClick(step.id, index)}
                className={cn(
                  'flex flex-col items-center relative',
                  isClickable
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-50'
                )}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                whileTap={isClickable ? { scale: 0.98 } : {}}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {isCompleted ? <CheckIcon className='h-5 w-5' /> : index + 1}
                </div>
                <span className='mt-2 text-xs font-medium'>{step.label}</span>
              </motion.button>

              {/* Connector line (except after last step) */}
              {index < steps.length - 1 && (
                <div className='flex-1 h-px mx-2'>
                  <div
                    className={cn(
                      'h-full w-full',
                      index < currentStepIndex ? 'bg-primary' : 'bg-secondary'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
