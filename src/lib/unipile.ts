import { UnipileClient } from 'unipile-node-sdk';

// Singleton instance
let client: UnipileClient | null = null;

export function getUnipileClient(): UnipileClient {
  if (!client) {
    const baseUrl = process.env.UNIPILE_API_URL;
    const token = process.env.UNIPILE_ACCESS_TOKEN;

    if (!baseUrl || !token) {
      throw new Error('UNIPILE_API_URL and UNIPILE_ACCESS_TOKEN must be set');
    }

    client = new UnipileClient(baseUrl, token);
  }

  return client;
}

/**
 * Find an existing Unipile LinkedIn account by LinkedIn username/email.
 * Returns the account ID if found, null otherwise.
 */
export async function findExistingLinkedinAccount(username: string): Promise<string | null> {
  const client = getUnipileClient();
  let cursor: string | undefined;

  do {
    const response = await client.account.getAll(cursor ? { cursor } : undefined);

    for (const account of response.items) {
      if (
        account.type === 'LINKEDIN' &&
        account.connection_params.im.username.toLowerCase() === username.toLowerCase()
      ) {
        return account.id;
      }
    }

    cursor = response.cursor ?? undefined;
  } while (cursor);

  return null;
}
