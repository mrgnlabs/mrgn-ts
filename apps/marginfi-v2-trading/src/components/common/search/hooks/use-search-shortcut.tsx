"use client";

import React from "react";

// Track if the shortcut is already registered
let isShortcutRegistered = false;
let currentCallback: (() => void) | null = null;

/**
 * Hook to register a global CMD+K / CTRL+K shortcut
 * Only one instance will be active at a time
 */
const useSearchShortcut = (callback: () => void) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K or Ctrl+K
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        callback();
      }
    };

    // If there's already a registered shortcut, remove it first
    if (isShortcutRegistered && currentCallback) {
      window.removeEventListener("keydown", handleKeyDown);
    }

    // Register the new callback
    currentCallback = callback;
    window.addEventListener("keydown", handleKeyDown);
    isShortcutRegistered = true;

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (currentCallback === callback) {
        isShortcutRegistered = false;
        currentCallback = null;
      }
    };
  }, [callback]);
};

export { useSearchShortcut };
