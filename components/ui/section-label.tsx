import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * The label treatment of DESIGN.md §2.4 — 11px uppercase at 0.14em over
 * `text-4`. §10.3: a section is this label plus its content at natural size.
 *
 * `text-4` rather than `text-3`: a section label is the quietest thing on a
 * screen that still has to be read, and sits one step below the metadata it
 * introduces.
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
      className={cn('text-label uppercase tracking-label text-text-4', className)}
    >
      {children}
    </Text>
  );
}

export { SectionLabel };
