import { useState } from 'react';
import { Utensils } from 'lucide-react';

interface DishImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function DishImage({ src, alt, className = '' }: DishImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Utensils className="w-6 h-6 mb-2 text-stone-400" strokeWidth={1.5} />
        <span className="text-xs font-medium text-stone-600 line-clamp-2 max-w-[180px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
