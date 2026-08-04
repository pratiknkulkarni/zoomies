import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { createTemplate } from '@/db/mutations/templates';

/**
 * A new template is a name and nothing else. Exercises are added on the screen
 * that follows, so slot configuration has one implementation rather than a
 * second that exists only before the row does — the same call made for
 * exercises in Phase 2.
 */
export default function NewTemplateScreen() {
  const [name, setName] = useState('');

  const named = name.trim().length > 0;

  const create = () => {
    if (!named) {
      return;
    }

    void createTemplate(name.trim()).then((id) => {
      router.replace({ pathname: '/template/[id]', params: { id } });
    });
  };

  return (
    <Screen bleed>
      <ScrollView contentContainerClassName="pb-3xl">
        <BackButton />

        <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
          New template
        </Text>

        <View className="gap-xl px-xl pt-xl">
          <View className="gap-xs">
            <SectionLabel>Name</SectionLabel>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Pull Day"
              autoCapitalize="words"
            />
          </View>

          <Button variant="primary" disabled={!named} onPress={create}>
            <Text>Create</Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
