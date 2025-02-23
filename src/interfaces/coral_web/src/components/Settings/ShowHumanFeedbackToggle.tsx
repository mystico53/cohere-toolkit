'use client';

import { Switch, Text } from '@/components/Shared';  // Note: Using Shared instead of UI
import { useSettingsStore } from '@/stores';

export const ShowHumanFeedbackToggle = () => {
  const { humanFeedback, setHumanFeedback } = useSettingsStore();

  return (
    <div className="flex items-center justify-between">
      <Text styleLevel="p">{/* or use STYLE_LEVEL_TO_CLASSES.p */}
        Human feedback
      </Text>
      <Switch
        checked={humanFeedback}
        onChange={setHumanFeedback}
        showLabel
      />
    </div>
  );
};