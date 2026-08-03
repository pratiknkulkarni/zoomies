import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * The label treatment of DESIGN.md §2.4 — 11px uppercase at 0.08em over
 * `text-3`. §10.3: a section is this label plus its content at natural size.
 *
 * Uppercasing happens here rather than in the caller's string, so the source
 * stays sentence case (§2.5).
 */
function SectionLabel({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Text
      className={cn('text-label uppercase tracking-label text-text-3', className)}
    >
      {children}
    </Text>
  );
}

export { SectionLabel };
