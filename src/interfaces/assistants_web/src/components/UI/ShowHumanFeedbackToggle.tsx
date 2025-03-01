import { Switch, Text } from '@/components/UI';
import { useSettingsStore } from '@/stores';

export const ShowHumanFeedbackToggle = () => {
  const { humanFeedback, setHumanFeedback } = useSettingsStore();

  const handleSwitchHumanFeedback = (checked: boolean) => {
    setHumanFeedback(checked);
  };

  return (
    <section className="mb-4 flex gap-6">
      <Text styleAs="label" className="font-medium">
        Side by Side Responses
      </Text>
      <Switch
        checked={humanFeedback}
        onChange={(checked: boolean) => handleSwitchHumanFeedback(checked)}
        showCheckedState
      />
    </section>
  );
};