import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const MISSION_KEY = ['mission'];
const DEFAULT_MISSION = 'Каждое следующее поколение видит лучше предыдущего благодаря заботе о зрении с детства';

async function fetchMission(): Promise<string> {
  const res = await fetch('/api/mission', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch mission');
  const data = await res.json();
  return data.text || DEFAULT_MISSION;
}

async function updateMission(text: string): Promise<string> {
  const res = await fetch('/api/mission', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to save mission');
  const data = await res.json();
  return data.text;
}

export function useMission() {
  const queryClient = useQueryClient();

  const { data: missionText = DEFAULT_MISSION, isLoading } = useQuery({
    queryKey: MISSION_KEY,
    queryFn: fetchMission,
    staleTime: 5 * 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: updateMission,
    onSuccess: (text) => {
      queryClient.setQueryData(MISSION_KEY, text);
    },
  });

  return {
    missionText,
    isLoading,
    saveMission: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
