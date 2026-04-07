const encoder = new TextEncoder();
const decoder = new TextDecoder();

type KeyConfig = {
  version: number;
  value: string;
};

type EncryptedValue = {
  ciphertext: string;
  ivOrNonce: string;
  keyVersion: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function getConfiguredKeys(): KeyConfig[] {
  const currentValue = Deno.env.get("STRIPE_SECRET_ENCRYPTION_KEY_CURRENT") ?? "";
  if (!currentValue) {
    throw new Error("STRIPE_SECRET_ENCRYPTION_KEY_CURRENT is not set");
  }

  const currentVersion = Number(Deno.env.get("STRIPE_SECRET_ENCRYPTION_KEY_VERSION_CURRENT") ?? "1");
  const previousValue = Deno.env.get("STRIPE_SECRET_ENCRYPTION_KEY_PREVIOUS") ?? "";
  const previousVersion = Number(Deno.env.get("STRIPE_SECRET_ENCRYPTION_KEY_VERSION_PREVIOUS") ?? "0");

  const keys: KeyConfig[] = [{ version: currentVersion, value: currentValue }];
  if (previousValue) {
    keys.push({ version: previousVersion, value: previousValue });
  }
  return keys;
}

async function importAesKey(rawValue: string) {
  const rawBytes = base64ToBytes(rawValue);
  return crypto.subtle.importKey("raw", rawBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptString(plaintext: string): Promise<EncryptedValue> {
  const [{ version, value }] = getConfiguredKeys();
  const key = await importAesKey(value);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    ivOrNonce: bytesToBase64(iv),
    keyVersion: version,
  };
}

export async function decryptString(args: EncryptedValue): Promise<string> {
  const keyConfig = getConfiguredKeys().find((config) => config.version === args.keyVersion);
  if (!keyConfig) {
    throw new Error(`Encryption key version ${args.keyVersion} is not configured`);
  }

  const key = await importAesKey(keyConfig.value);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(args.ivOrNonce) },
    key,
    base64ToBytes(args.ciphertext),
  );

  return decoder.decode(decrypted);
}

export function currentKeyVersion(): number {
  return getConfiguredKeys()[0].version;
}
