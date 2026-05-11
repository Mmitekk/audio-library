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
    // Get the latest production deployment to find the git commit SHA
    const projectResponse = await fetch(
      `https://api.vercel.com/v6/projects/${VERCEL_PROJECT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (!projectResponse.ok) {
      throw new Error(`Failed to fetch project: ${projectResponse.status}`);
    }

    const projectData = await projectResponse.json();
    const prodAlias = projectData.alias?.[0]?.deployment;
    const commitSha = prodAlias?.meta?.githubCommitSha;

    if (!commitSha) {
      throw new Error('No git commit SHA found for production deployment');
    }

    // Trigger redeploy using gitSource (the only reliable method)
    const redeployResponse = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'audio-library',
          project: VERCEL_PROJECT_ID,
          gitSource: {
            type: 'github',
            repoId: 1232255779,
            ref: 'main',
            sha: commitSha,
          },
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

  // Create a fake test request (no DB write) just to test email delivery
  const testRequest = {
    id: 'test',
    name: 'Тест',
    email: undefined,
    description: 'Это тестовое письмо для проверки настроек уведомлений.',
    createdAt: new Date().toISOString(),
    fulfilled: false,
  };
  const result = await sendRequestNotification(testRequest);

  return result;
}
