export type EnemyDecision = 'chase' | 'attack' | 'jump';

// process may not exist in browser builds, so declare a minimal shape
declare const process: { env?: Record<string, string | undefined> } | undefined;

/**
 * Queries OpenAI for the next enemy action.
 *
 * If `OPENAI_API_KEY` is not configured, the function logs a warning and
 * immediately returns `'chase'` as a sensible default. When the key is
 * configured, `null` is returned only if the request fails or no valid action
 * is found.
 */
export async function requestEnemyAction(
  context: { distance: number }
): Promise<EnemyDecision | null> {
  const apiKey = process?.env?.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not configured');
    return 'chase';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You control a ruthless boss inspired by M. Bison from the European release of Street Fighter 2. Respond with a single word: "chase", "attack" or "jump" to overwhelm the player while minimizing damage.',
          },
          {
            role: 'user',
            content: `The enemy is ${Math.round(
              context.distance
            )} pixels from the player. What should it do?`,
          },
        ],
        max_tokens: 1,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error('OpenAI API error', await res.text());
      return null;
    }

    const data = await res.json();
    const text: string =
      data.choices?.[0]?.message?.content?.toLowerCase() ?? '';

    if (text.includes('attack')) return 'attack';
    if (text.includes('jump')) return 'jump';
    if (text.includes('chase')) return 'chase';
    return null;
  } catch (err) {
    clearTimeout(timeout);
    console.error('OpenAI request failed', err);
    return null;
  }
}
