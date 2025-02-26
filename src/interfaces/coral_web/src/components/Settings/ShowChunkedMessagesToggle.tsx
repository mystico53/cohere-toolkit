'use client';

import { Switch, Text } from '@/components/Shared';
import { useSettingsStore } from '@/stores';

export const ShowChunkedMessagesToggle = () => {
  const { showChunkedMessages, setShowChunkedMessages } = useSettingsStore();

  return (
    <div className="flex items-center justify-between">
      <Text styleLevel="p">
        Chunked messages
      </Text>
      <Switch
        checked={showChunkedMessages}
        onChange={setShowChunkedMessages}
        showLabel
      />
    </div>
  );
};