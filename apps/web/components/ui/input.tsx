import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, placeholder, 'aria-label': ariaLabel, ...props }, ref) => (
    <input
      ref={ref}
      placeholder={placeholder}
      aria-label={ariaLabel ?? (typeof placeholder === 'string' ? placeholder : undefined)}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-foreground outline-none ring-0 placeholder:text-foreground/40 focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent/60',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
