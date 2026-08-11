import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** "page" for the top-of-page title (~30px), "section" for in-page groupings (24px). */
  size?: "page" | "section";
};

function SectionTitle({ eyebrow, title, description, action, size = "section" }: SectionTitleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-caption uppercase tracking-[0.14em] text-deep-fern">{eyebrow}</p>
        ) : null}
        <h2
          className={cn(
            "mt-1 font-display font-medium text-foreground first:mt-0",
            size === "page" ? "text-heading" : "text-heading-sm",
          )}
        >
          {title}
        </h2>
        {description && <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export { SectionTitle };
