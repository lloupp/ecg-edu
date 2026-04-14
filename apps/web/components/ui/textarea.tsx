import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('flex min-h-[120px] w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-secondary', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
