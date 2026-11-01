import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect if the current viewport is a mobile device.
 * Uses a media query listener for real-time responsiveness.
 *
 * @returns boolean - True if the screen width is less than 768px.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
