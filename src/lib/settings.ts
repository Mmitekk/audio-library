const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_QG1xAc1X8N05FmOBucsszCQPlWAh';

type EnvTarget = ('production' | 'preview' | 'development')[];

interface VercelEnvVarEntry {
  id: string;
  key: string;
  value?: string;
  type: string;
  target: string[];
}

async function listEnvVars(): Promise<VercelEnvVarEntry[]> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list env vars: ${response.status}`);
  }

  const data = await response.json();
  return data.envs || [];
}

async function deleteEnvVar(envId: string): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${envId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete env var ${envId}: ${response.status}`);
  }
}

async function createEnvVar(key: string, value: string): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview', 'development'],
        },
      ]),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create env var: ${response.status}`);
  }
}

async function patchEnvVar(envId: string, value: string): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${envId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update env var ${envId}: ${response.status}`);
  }
}

export async function updateEnvVar(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  if (!VERCEL_TOKEN) {
    return { success: false, error: 'VERCEL_TOKEN not configured' };
  }

  try {
    const existing = await listEnvVars();
    const found = existing.find((e) => e.key === key);

    if (found) {
      await patchEnvVar(found.id, value);
    } else {
      await createEnvVar(key, value);
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
    const existing = await listEnvVars();

    for (const [key, value] of Object.entries(vars)) {
      const found = existing.find((e) => e.key === key);

      if (found) {
        await patchEnvVar(found.id, value);
      } else {
        await createEnvVar(key, value);
      }
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
