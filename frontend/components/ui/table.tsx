"use client";

import { cn } from "@/lib/utils";

export function Table({
  className,
  ...rest
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className={cn("w-full text-sm", className)} {...rest} />
    </div>
  );
}

export function THead({
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("bg-neutral-50 text-sm font-medium text-neutral-600", className)}
      {...rest}
    />
  );
}

export function TBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-neutral-100", className)} {...rest} />;
}

export function TR({
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-primary-50/50", className)}
      {...rest}
    />
  );
}

export function TH({
  className,
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("whitespace-nowrap px-4 py-3 text-left font-medium", className)}
      {...rest}
    />
  );
}

export function TD({
  className,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-3 text-neutral-700", className)} {...rest} />
  );
}
