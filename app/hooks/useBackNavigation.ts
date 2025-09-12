import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useBackNavigation() {
  const router = useRouter();

  const goBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // If no history, go to home page
      router.push('/');
    }
  };

  // Handle browser back button (mobile and desktop)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // This will be triggered when the user uses the browser back button
      // The router.back() will handle the navigation
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return { goBack };
}
