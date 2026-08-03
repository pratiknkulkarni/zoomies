import { Tabs } from 'expo-router';
import { Dumbbell, House, ScrollText } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { iconWithClassName } from '@/components/ui/icon';

const HomeIcon = iconWithClassName(House);
const HistoryIcon = iconWithClassName(ScrollText);
const ExercisesIcon = iconWithClassName(Dumbbell);

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

/**
 * The default bar paints its own colours, which would ignore the token set and
 * render light chrome in dark mode. This one is built from tokens instead.
 *
 * Active state is carried by weight *and* colour, never colour alone
 * (DESIGN.md §9). The accent does not appear here — §3.3 and §8 both rule it
 * out for tabs.
 *
 * Insets come from props, not `useSafeAreaInsets`: the navigator calls this as
 * a plain function inside a context consumer, so a hook here is an invalid hook
 * call. It hands the same values in already.
 */
function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  return (
    <View
      className="flex-row border-t border-border bg-bg"
      // Device geometry read at runtime, not a design value.
      style={{ paddingBottom: insets.bottom }}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) {
          return null;
        }

        const isFocused = state.index === index;
        const label = descriptor.options.title ?? route.name;
        const Icon =
          route.name === 'index'
            ? HomeIcon
            : route.name === 'history'
              ? HistoryIcon
              : ExercisesIcon;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
            className="min-h-touch flex-1 items-center justify-center gap-xs py-md"
          >
            <Icon
              size={24}
              strokeWidth={1.5}
              className={isFocused ? 'text-text' : 'text-text-3'}
            />
            <Text
              className={
                isFocused
                  ? 'text-caption font-sans-semibold text-text'
                  : 'text-caption font-sans text-text-3'
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={TabBar}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises' }} />
    </Tabs>
  );
}
