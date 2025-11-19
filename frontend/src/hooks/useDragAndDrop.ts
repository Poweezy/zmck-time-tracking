import { useState, useRef, DragEvent } from 'react';

interface UseDragAndDropOptions {
  onDrop: (itemId: number, newStatus: string) => void;
  disabled?: boolean;
}

export const useDragAndDrop = ({ onDrop, disabled = false }: UseDragAndDropOptions) => {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: DragEvent, itemId: number) => {
    if (disabled) return;
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', itemId.toString());
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: DragEvent) => {
    if (disabled) return;
    setDraggedItem(null);
    setDragOverColumn(null);
    
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: DragEvent, columnId: string) => {
    if (disabled || !draggedItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    if (disabled) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent, columnId: string, newStatus: string) => {
    if (disabled || !draggedItem) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem) {
      onDrop(draggedItem, newStatus);
    }
    
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  return {
    draggedItem,
    dragOverColumn,
    dragRef,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

