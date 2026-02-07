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
