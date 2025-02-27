import { useState, useEffect } from 'react';

interface UseTextSelectionResult {
  selectedText: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  containerElement: HTMLElement | null;
  isSelecting: boolean;
  clearSelection: () => void;
}

/**
 * Hook to track text selection within a specific container element
 * @param containerRef Reference to the container element to monitor for selections
 */
const useTextSelection = (
  containerRef: React.RefObject<HTMLElement>
): UseTextSelectionResult => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setContainerElement(containerRef.current);
    }
  }, [containerRef]);

  useEffect(() => {
    if (!containerElement) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection) return;

      // Check if the selection is within our container
      if (
        selection.rangeCount > 0 &&
        containerElement.contains(selection.anchorNode) &&
        selection.toString().trim() !== ''
      ) {
        const range = selection.getRangeAt(0);
        const text = selection.toString();
        
        setSelectedText(text);
        setSelectionStart(range.startOffset);
        setSelectionEnd(range.endOffset);
        setIsSelecting(true);
      } else if (selection.toString().trim() === '') {
        // Only clear if the selection is empty
        clearSelection();
      }
    };

    const handleMouseUp = () => {
      handleSelectionChange();
    };
    
    const handleMouseDown = () => {
      // Track when selection might be starting
      setIsSelecting(true);
    };

    // Handle keyboard-based selection
    const handleKeyUp = (e: KeyboardEvent) => {
      // Check for keys commonly used in selection (shift + arrow keys)
      if (e.shiftKey && (e.key.includes('Arrow') || e.key === 'Home' || e.key === 'End')) {
        handleSelectionChange();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    containerElement.addEventListener('mouseup', handleMouseUp);
    containerElement.addEventListener('mousedown', handleMouseDown);
    containerElement.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      containerElement.removeEventListener('mouseup', handleMouseUp);
      containerElement.removeEventListener('mousedown', handleMouseDown);
      containerElement.removeEventListener('keyup', handleKeyUp);
    };
  }, [containerElement]);

  const clearSelection = () => {
    setSelectedText('');
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

  return {
    selectedText,
    selectionStart,
    selectionEnd,
    containerElement,
    isSelecting,
    clearSelection,
  };
};

export default useTextSelection;