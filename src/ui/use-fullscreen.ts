import { useCallback, useEffect, useState } from "react";

// The whole page goes fullscreen, so the clock controls and the roster stay usable.
// iPhone Safari has no Fullscreen API for pages; there `supported` is false.
export function useFullscreen(): {
  supported: boolean;
  fullscreen: boolean;
  toggleFullscreen: () => void;
} {
  const [fullscreen, setFullscreen] = useState(
    () => document.fullscreenElement !== null,
  );

  useEffect(() => {
    function sync(): void {
      setFullscreen(document.fullscreenElement !== null);
    }
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === null) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  return {
    supported: document.fullscreenEnabled,
    fullscreen,
    toggleFullscreen,
  };
}
