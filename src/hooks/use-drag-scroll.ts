import { useCallback, useEffect, useRef } from 'react';

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const container = ref.current;
    if (!container) return;
    isDragging.current = true;
    startX.current = e.pageX - container.offsetLeft;
    scrollLeft.current = container.scrollLeft;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  }, []);

  const onMouseUp = useCallback(() => {
    const container = ref.current;
    if (!container) return;
    isDragging.current = false;
    container.style.cursor = '';
    container.style.userSelect = '';
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const container = ref.current;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    container.scrollLeft = scrollLeft.current - walk;
  }, []);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const handleMouseUp = () => onMouseUp();
    const handleMouseMove = (e: MouseEvent) => onMouseMove(e);

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onMouseMove, onMouseUp]);

  return { ref, onMouseDown };
}
