import '../global.css';

// Imported per weight, not from the package root: the root module requires
// every one of the eighteen faces, and DESIGN.md §2.2 ships exactly two.
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono/600SemiBold';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/screen';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { storedAppearance } from '@/db/queries/settings';
import { seedIfNeeded } from '@/db/seed';

// The splash screen is held until the faces resolve and the database is ready,
// so no frame ever renders in a fallback font or against an unmigrated schema.
void SplashScreen.preventAutoHideAsync();

/*
  The stored appearance, applied before the first frame (FEATURES.md §13).

  At module scope rather than in an effect: an effect runs after a render, so
  someone who chose Light would see one frame of dark on every launch. The read
  is synchronous and safe this early — it is one row of a local file, and it
  falls back to `system` if the table is not there yet, which on a first launch
  it is not.

  Nothing else in the application reads the colour scheme. Every token has a
  dark value, so no component contains a theme conditional.
*/
colorScheme.set(storedAppearance());

export default function RootLayout() {
  // Two weights only, 400 and 600 (DESIGN.md §2.2).
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_600SemiBold,
  });

  const { success: migrated, error: migrationError } = useMigrations(
    db,
    migrations,
  );

  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  /*
    The override, applied again now that the application is running.

    The module-scope call above is not enough on its own, and the reason is
    worth stating because it is invisible from this file. NativeWind's
    `colorScheme.set` does not hold the value itself — outside tests it only
    calls `Appearance.setColorScheme`, and the resolved scheme is read back from
    an observable that its own listener updates:

        appearance.addChangeListener((state) => {
          if (AppState.currentState === "active") { … }
        });

    At module scope the application is not active yet, so that guard drops the
    change and the observable keeps the system value. The override therefore
    survived until the process was killed and never one launch further — which
    is exactly the symptom: choosing Dark worked, and reopening on a light phone
    came back light.

    Running once on mount is after the listener will accept it and long before
    the splash lifts, so nothing flashes. The module-scope call stays: it costs a
    single synchronous row read and is what covers the first frame on the launch
    where it does land.
  */
  useEffect(() => {
    colorScheme.set(storedAppearance());
  }, []);

  useEffect(() => {
    if (!migrated) {
      return;
    }

    seedIfNeeded()
      .then(() => setSeeded(true))
      .catch((cause: unknown) => {
        setSeedError(cause instanceof Error ? cause : new Error(String(cause)));
      });
  }, [migrated]);

  // A missing font degrades to a fallback face; a missing database loses
  // training history. Only the second one blocks.
  const fontsSettled = fontsLoaded || fontError !== null;
  const dbError = migrationError ?? seedError;
  const ready = fontsSettled && (dbError !== null || (migrated && seeded));

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  // Failing loudly beats running against a schema that is not there. Nothing
  // is written until this resolves.
  if (dbError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Screen>
          <Text className="pt-2xl text-title font-sans-semibold text-text">
            The database did not open
          </Text>
          <Text className="pt-sm text-bodySm font-sans text-text-2">
            {dbError.message}
          </Text>
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View className="flex-1 bg-bg">
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </SafeAreaProvider>
  );
}
