import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FEATURED_CATEGORY_ART } from '@/lib/constants';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import type { Product } from '@/types';

export function CategoryStrip({
  products,
  selectedCategory,
  onCategorySelect,
}: {
  products: Product[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const { ref: dragRef, onMouseDown } = useDragScroll();

  const topCategories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
      acc[product.normalizedCategory] = (acc[product.normalizedCategory] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [products]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let lastTime = 0;
    const speed = 0.5; // pixels per frame

    const animate = (currentTime: number) => {
      if (!isAnimating) return;
      
      if (lastTime === 0) {
        lastTime = currentTime;
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastTime;
      const scrollAmount = speed * (deltaTime / 16.67); // normalize to 60fps
      
      container.scrollLeft += scrollAmount;

      // Check if we've reached the end, then reset to beginning for infinite loop
      if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
        container.scrollLeft = 0;
      }

      lastTime = currentTime;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAnimating]);

  const handleMouseEnter = () => setIsAnimating(false);
  const handleMouseLeave = () => setIsAnimating(true);

  // Duplicate cards for seamless infinite scroll
  const categoryCards = FEATURED_CATEGORY_ART.map((item, index) => {
    const category = topCategories[index] ?? topCategories[0] ?? '';
    return (
      <button
        key={`${item.key}-original`}
        className={`group relative overflow-hidden rounded-3xl text-left shadow-soft flex-shrink-0 w-[300px] sm:w-[340px] xl:w-[380px] ${
          selectedCategory === category ? 'ring-2 ring-brand-400' : ''
        }`}
        onClick={() => onCategorySelect(category)}
      >
        <img
          src={item.image}
          alt={item.title[i18n.language as 'en' | 'fr' | 'rw']}
          className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">{category}</p>
          <p className="mt-2 text-2xl font-bold">{item.title[i18n.language as 'en' | 'fr' | 'rw']}</p>
        </div>
      </button>
    );
  });

  // Duplicate the cards for seamless infinite scroll
  const duplicatedCards = [...categoryCards, ...categoryCards.map((card) => 
    React.cloneElement(card as React.ReactElement<any>, { key: `${card.key}-duplicate` })
  )];

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('featuredCategories')}</h2>
      </div>
      <div
        ref={(node) => {
          (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (dragRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className="overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide cursor-grab"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={onMouseDown}
        style={{ scrollBehavior: 'auto' }}
      >
        <div className="flex gap-4 min-w-max">
          {duplicatedCards}
        </div>
      </div>
    </section>
  );
}
