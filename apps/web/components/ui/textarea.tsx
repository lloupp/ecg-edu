import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, placeholder, 'aria-label': ariaLabel, ...props }, ref) => (
    <textarea
      ref={ref}
      placeholder={placeholder}
      aria-label={ariaLabel ?? (typeof placeholder === 'string' ? placeholder : undefined)}
      className={cn(
        'flex min-h-[120px] w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent/60',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
