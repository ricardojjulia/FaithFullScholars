'use client';

import React from 'react';
import { FeedbackSessionProvider } from './feedback-provider';
import { FeedbackErrorBoundary } from './error-boundary';
import { FeedbackButton } from './feedback-button';

export function FeedbackShell({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackSessionProvider>
      <FeedbackErrorBoundary>
        {children}
        <FeedbackButton />
      </FeedbackErrorBoundary>
    </FeedbackSessionProvider>
  );
}
