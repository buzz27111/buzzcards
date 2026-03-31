'use client';

export default function LoadingSkeleton() {
  return (
    <div className="grid gap-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-foreground/10 bg-background/70"
        >
          {/* Image placeholder */}
          <div className="aspect-video w-full bg-foreground/10" />

          <div className="flex flex-col gap-3 p-4">
            {/* Category badge + meta */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded-full bg-foreground/10" />
              <div className="h-4 w-12 rounded bg-foreground/10" />
              <div className="h-4 w-16 rounded bg-foreground/10" />
            </div>

            {/* Title */}
            <div className="h-5 w-3/4 rounded bg-foreground/10" />
            <div className="h-5 w-1/2 rounded bg-foreground/10" />

            {/* Summary lines */}
            <div className="h-4 w-full rounded bg-foreground/8" />
            <div className="h-4 w-5/6 rounded bg-foreground/8" />
            <div className="h-4 w-2/3 rounded bg-foreground/8" />

            {/* Source */}
            <div className="mt-1 h-3 w-24 rounded bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
