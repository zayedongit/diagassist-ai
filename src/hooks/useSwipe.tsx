import { useState } from 'react';

interface SwipeInput {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  minSwipeDistance?: number;
}

export const useSwipe = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeDown,
  onSwipeUp,
  minSwipeDistance = 50 
}: SwipeInput) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const [disabled, setDisabled] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchStartY || !touchEndX || !touchEndY || disabled) return;
    
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;
    
    // Only process horizontal swipes to avoid interfering with scrolling
    // Require horizontal movement to be significantly larger than vertical
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY) * 1.5;
    
    if (isHorizontalSwipe) {
      // Horizontal swipes only
      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;

      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    }
    // Ignore vertical swipes entirely to prevent scroll conflicts
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    disableSwipe: () => setDisabled(true),
    enableSwipe: () => setDisabled(false),
  };
};
