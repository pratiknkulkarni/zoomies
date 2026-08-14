import { Tabs } from 'expo-router';
import {
  CalendarRange,
  Dumbbell,
  House,
  ScrollText,
  SlidersHorizontal,
} from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { iconWithClassName } from '@/components/ui/icon';

const HomeIcon = iconWithClassName(House);
const HistoryIcon = iconWithClassName(ScrollText);
const ExercisesIcon = iconWithClassName(Dumbbell);

/**
 * Sliders rather than a gear.
 *
 * A gear is the icon for a settings screen that has grown a hundred switches.
 * This one has three appearance rows, a backup and a reset, and §8 says an icon
 * appears only where a word would be slower to read — the sliders say *a few
 * things you can set* where a cog says *configuration*.
 */
const SettingsIcon = iconWithClassName(SlidersHorizontal);

/**
 * A span of dates, which is what the screen is: thirteen weeks of squares and
 * three figures about the same stretch. Not a single calendar page — nothing on
 * Look back is about one day.
 */
const LookBackIcon = iconWithClassName(CalendarRange);

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

/**
 * The default bar paints its own colours, which would ignore the token set and
 * render light chrome in dark mode. This one is built from tokens instead.
 *
 * Active state is carried by weight *and* ink depth, never one alone
 * (DESIGN.md §9). There is no accent in the system to reach for here, and an
 * inactive tab sits at `text-3` with the rest of the metadata.
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
              : route.name === 'look-back'
                ? LookBackIcon
                : route.name === 'exercises'
                  ? ExercisesIcon
                  : SettingsIcon;

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
      {/*
        Ordered as the application is used, left to right: train, read what
        happened, read what it adds up to, tend the library, set the thing up.
      */}
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="look-back" options={{ title: 'Look back' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
