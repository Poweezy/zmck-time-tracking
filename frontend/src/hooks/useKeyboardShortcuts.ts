import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Common shortcuts helper
export const useCommonShortcuts = () => {
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => {
        // Focus search or create button
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
        const createButton = document.querySelector('button:has-text("Create"), [aria-label*="Create"]') as HTMLButtonElement;
        if (searchInput) {
          searchInput.focus();
        } else if (createButton) {
          createButton.click();
        }
      },
      description: 'Focus search or create',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        // Navigate to create new item based on current page
        const path = window.location.pathname;
        if (path.includes('/projects')) {
          navigate('/projects/new');
        } else if (path.includes('/tasks')) {
          navigate('/tasks/new');
        } else {
          navigate('/tasks/new');
        }
      },
      description: 'Create new item',
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus search',
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals
        const modal = document.querySelector('[role="dialog"]');
        const closeButton = modal?.querySelector('button[aria-label*="Close"], button:has-text("Cancel")') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
      },
      description: 'Close modal',
    },
  ]);
};

