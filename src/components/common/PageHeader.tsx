import React from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  trailing?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  trailing
}) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-1 max-w-2xl text-xs text-ink-muted sm:text-sm">
        {description}
      </p>
    </div>
    {trailing}
  </header>
);
