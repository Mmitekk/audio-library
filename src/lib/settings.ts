const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_Qf8AQPcjCBwBQlVgsBMRpx3s';

interface VercelEnvVar {
  key: string;
  value: string;
  type: 'encrypted';
  target: ('production' | 'preview' | 'development')[];
}

export async function updateEnvVar(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  if (!VERCEL_TOKEN) {
    return { success: false, error: 'VERCEL_TOKEN not configured' };
  }

  try {
    // Update the environment variable via Vercel API
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upsert: [
            {
              key,
              value,
              type: 'encrypted',
              target: ['production', 'preview', 'development'],
            } satisfies VercelEnvVar,
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Vercel API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update Vercel env var:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateMultipleEnvVars(
  vars: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  if (!VERCEL_TOKEN) {
    return { success: false, error: 'VERCEL_TOKEN not configured' };
  }

  try {
    const envVars: VercelEnvVar[] = Object.entries(vars).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted' as const,
      target: ['production', 'preview', 'development'] as const,
    }));

    const response = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upsert: envVars,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Vercel API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update Vercel env vars:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function triggerRedeploy(): Promise<{ success: boolean; error?: string }> {
  if (!VERCEL_TOKEN) {
    return { success: false, error: 'VERCEL_TOKEN not configured' };
  }

  try {
    // Get the latest deployment for the project
    const deploymentsResponse = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/deployments?state=READY&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (!deploymentsResponse.ok) {
      throw new Error(`Failed to fetch deployments: ${deploymentsResponse.status}`);
    }

    const deploymentsData = await deploymentsResponse.json();
    const latestDeployment = deploymentsData.deployments?.[0];

    if (!latestDeployment) {
      throw new Error('No ready deployment found to redeploy from');
    }

    // Trigger redeploy using the production deployment's config
    const redeployResponse = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: latestDeployment.name,
          project: VERCEL_PROJECT_ID,
          source: latestDeployment.source,
          target: 'production',
        }),
      }
    );

    if (!redeployResponse.ok) {
      const errorData = await redeployResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Redeploy API error: ${redeployResponse.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to trigger redeploy:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testEmail(): Promise<{ success: boolean; error?: string }> {
  const { sendRequestNotification } = await import('./email');
  const { addRequest } = await import('./store');

  // Create a test request and send it
  const testRequest = addRequest('Тест', undefined, 'Это тестовое письмо для проверки настроек уведомлений.');
  const result = await sendRequestNotification(testRequest);

  // Remove the test request from the store
  const { getRequests } = await import('./store');
  const requests = getRequests();
  const idx = requests.findIndex((r) => r.id === testRequest.id);
  if (idx !== -1) {
    requests.splice(idx, 1);
  }

  return result;
}
