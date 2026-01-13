/** @format */

import { Media } from '@/types/book.interface';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const PYTHON_BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8000';

export const fetchArticleContent = async (
  url: string,
  retryCount = 0
): Promise<
  { content: string; media: Media[]; title?: string } | { error: string }
> => {
  try {
    console.log(`Attempting to fetch article content from: ${url}`);

    // Call the Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/fetch-article/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch article');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to extract article content');
    }

    console.log(`Successfully fetched article: ${data.title}`);

    return {
      content: data.content || '',
      media: data.media || [],
      title: data.title,
    };
  } catch (error) {
    console.error(`Error fetching article (attempt ${retryCount + 1}):`, error);

    // Implement retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} for URL: ${url}`);
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * (retryCount + 1))
      );
      return fetchArticleContent(url, retryCount + 1);
    }

    return {
      error: `Failed to fetch article after ${MAX_RETRIES + 1} attempts: ${
        (error as Error).message
      }`,
    };
  }
};

export const generateChapterSummary = async (
  title: string,
  content: string
): Promise<string> => {
  try {
    console.log('Generating summary for chapter:', title);

    // Call the Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/generate-summary/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
       console.error('Error invoking Gemini function via Python backend');
       throw new Error('Failed to generate summary');
    }
    
    const data = await response.json();

    return (
      data?.summary ||
      'Failed to generate summary. You can edit this description manually.'
    );
  } catch (error) {
    console.error('Error generating chapter summary:', error);
    return 'Failed to generate summary. You can edit this description manually.';
  }
};

export const extractTitleFromUrl = (url: string): string => {
  try {
    // Try to extract a readable title from the URL
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Replace dashes, underscores with spaces and capitalize
      return lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '') // Remove file extensions
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Fallback to domain name if path doesn't provide a good title
    return urlObj.hostname
      .replace(/^www\./, '')
      .split('.')
      .slice(0, -1)
      .join(' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    return 'Untitled Article';
  }
};
