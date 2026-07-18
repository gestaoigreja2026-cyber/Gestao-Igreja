import { Page } from '@playwright/test';

const defaultUser = {
  id: 'user-id',
  email: 'joao@igreja.com',
  user_metadata: { name: 'João Silva' },
  app_metadata: {},
};

const defaultProfile = {
  id: 'user-id',
  church_id: 'church-id',
  full_name: 'João Silva',
  role: 'pastor',
  registration_completed: true,
  avatar_url: null,
};

export async function mockSupabaseAuth(page: Page, options?: { email?: string; role?: string; name?: string }) {
  const email = options?.email || defaultUser.email;
  const name = options?.name || defaultProfile.full_name;
  const role = options?.role || defaultProfile.role;
  const userId = defaultUser.id;

  await page.route('**/auth/v1/token*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-access-token',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        token_type: 'bearer',
        user: {
          id: userId,
          email,
          user_metadata: { name },
        },
      }),
    });
  });

  await page.route('**/auth/v1/user*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: userId,
          email,
          user_metadata: { name },
        },
      }),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        ...defaultProfile,
        full_name: name,
        role,
      }]),
    });
  });

  await page.route('**/auth/v1/session*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          session: {
            access_token: 'fake-access-token',
            user: { id: userId, email, user_metadata: { name } },
          },
        },
      }),
    });
  });
}

export async function mockSupabasePasswordReset(page: Page, email = defaultUser.email) {
  await page.route('**/auth/v1/recover*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { email },
        error: null,
      }),
    });
  });
}

export async function mockSupabaseSessionSuccess(page: Page) {
  await page.route('**/auth/v1/session*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          session: {
            access_token: 'fake-access-token',
            user: { id: defaultUser.id, email: defaultUser.email },
          },
        },
      }),
    });
  });
}
