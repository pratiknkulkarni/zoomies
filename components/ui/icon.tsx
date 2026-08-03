import type { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

/**
 * Lucide icons take a `color` prop rather than a style, so NativeWind cannot
 * reach them through className on its own. Mapping the resolved text colour
 * onto that prop lets icons be coloured from tokens like everything else —
 * `<Icon className="text-text-3" />` — instead of a literal.
 *
 * DESIGN.md §8: 20px inline, 24px standalone, stroke width 1.5, colour
 * `text-2`. Tab bar icons are the exception and use `text` / `text-3`.
 */
export function iconWithClassName(icon: LucideIcon): LucideIcon {
  cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: { color: true },
    },
  });
  return icon;
}
