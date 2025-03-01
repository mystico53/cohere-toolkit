'use client';

import { Switch, Text } from '@/components/Shared';
import { useSettingsStore } from '@/stores';

export const ShowHumanFeedbackToggle = () => {
  const { humanFeedback, setHumanFeedback } = useSettingsStore();

  return (
    <div className="flex items-center justify-between">
      <Text styleLevel="p">{/* or use STYLE_LEVEL_TO_CLASSES.p */}
        Side by Side Responses
      </Text>
      <Switch
        checked={humanFeedback}
        onChange={setHumanFeedback}
        showLabel
      />
    </div>
  );
};