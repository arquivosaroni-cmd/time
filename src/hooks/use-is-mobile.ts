'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';

const MOBILE_BREAKPOINT = 768; // Corresponds to md in Tailwind

export const useIsMobile = () => {
  const [isClient, setIsClient] = useState(false);
  const isMobile = useMediaQuery({
    query: `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
  });

  useEffect(() => {
    // This effect runs only on the client, ensuring that `isMobile` is
    // not computed on the server, which would lead to hydration mismatches.
    setIsClient(true);
  }, []);

  // Return the computed value only on the client-side.
  // On the server (and during initial hydration), it defaults to false.
  return isClient ? isMobile : false;
};
