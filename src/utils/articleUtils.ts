/** @format */

import { Chapter, Media } from '@/types/book.interface';
import { supabase } from '@/integrations/supabase/client';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const fetchArticleContent = async (
  url: string,
  retryCount = 0
): Promise<
  { content: string; media: Media[]; title?: string } | { error: string }
> => {
  try {
    console.log(`Attempting to fetch article content from: ${url}`);

    // Call the fetch-article edge function
    const { data, error } = await supabase.functions.invoke('fetch-article', {
      body: { url },
    });

    if (error) {
      console.error('Error invoking fetch-article function:', error);
      throw new Error(error.message || 'Failed to fetch article');
    }

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

    // Call the Gemini edge function to generate a summary
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: {
        action: 'generateChapterSummary',
        data: {
          title,
          content,
        },
      },
    });

    if (error) {
      console.error('Error invoking Gemini function:', error);
      throw error;
    }

    if (data?.error) {
      console.error('Gemini API error:', data.error);
      throw new Error(data.error);
    }

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
