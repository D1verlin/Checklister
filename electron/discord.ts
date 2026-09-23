import { Client } from '@xhayper/discord-rpc';

// Default CheckLister Discord Application Client ID
const DEFAULT_CLIENT_ID = '1343279188849721384';

let client: Client | null = null;
let isConnected = false;
let isConnecting = false;
let rpcEnabled = true;

export interface DiscordActivityOptions {
  details: string;
  state?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
}

export async function initDiscordRpc(clientId: string = DEFAULT_CLIENT_ID, enabled: boolean = true) {
  rpcEnabled = enabled;
  if (!rpcEnabled) {
    clearDiscordActivity();
    return;
  }

  if (isConnected || isConnecting) return;

  try {
    isConnecting = true;
    client = new Client({ clientId });

    client.on('ready', () => {
      isConnected = true;
      isConnecting = false;
      console.log('[Discord RPC] Connected as', client?.user?.username);
    });

    client.on('disconnected', () => {
      isConnected = false;
      isConnecting = false;
      console.log('[Discord RPC] Disconnected');
    });

    await client.login().catch((err) => {
      isConnecting = false;
      isConnected = false;
      // Silently ignore if Discord desktop app is not running
      console.log('[Discord RPC] Login skipped (Discord likely closed):', err?.message || err);
    });
  } catch (err) {
    isConnecting = false;
    isConnected = false;
  }
}

export function setDiscordRpcEnabled(enabled: boolean) {
  rpcEnabled = enabled;
  if (!enabled) {
    clearDiscordActivity();
  }
}

export async function setDiscordActivity(options: DiscordActivityOptions) {
  if (!rpcEnabled || !client || !isConnected) return;

  try {
    await client.user?.setActivity({
      details: options.details,
      state: options.state,
      startTimestamp: options.startTimestamp ? new Date(options.startTimestamp) : undefined,
      endTimestamp: options.endTimestamp ? new Date(options.endTimestamp) : undefined,
      largeImageKey: options.largeImageKey || 'checklister_icon',
      largeImageText: options.largeImageText || 'CheckLister',
      smallImageKey: options.smallImageKey,
      smallImageText: options.smallImageText,
      instance: false,
    });
  } catch (err) {
    console.warn('[Discord RPC] Failed to set activity:', err);
  }
}

export async function clearDiscordActivity() {
  if (!client || !isConnected) return;
  try {
    await client.user?.clearActivity();
  } catch {}
}

export async function destroyDiscordRpc() {
  if (client) {
    try {
      await client.destroy();
    } catch {}
    client = null;
    isConnected = false;
  }
}
