import { createServiceClient } from "./supabase.ts";
import { currentKeyVersion, decryptString, encryptString } from "./crypto.ts";

type SecretRow = {
  user_id: string;
  legacy_key_plaintext: string | null;
  ciphertext: string | null;
  iv_or_nonce: string | null;
  key_version: number | null;
};

export async function saveOperatorStripeSecret(userId: string, plaintextKey: string) {
  const encrypted = await encryptString(plaintextKey);
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("stripe_keys")
    .upsert(
      {
        user_id: userId,
        ciphertext: encrypted.ciphertext,
        iv_or_nonce: encrypted.ivOrNonce,
        key_version: encrypted.keyVersion,
        legacy_key_plaintext: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}

async function upgradeLegacySecret(row: SecretRow) {
  if (!row.legacy_key_plaintext) return row.legacy_key_plaintext;
  await saveOperatorStripeSecret(row.user_id, row.legacy_key_plaintext);
  return row.legacy_key_plaintext;
}

async function rotateSecretIfNeeded(userId: string, plaintextKey: string, keyVersion: number | null) {
  if (keyVersion === currentKeyVersion()) return;
  await saveOperatorStripeSecret(userId, plaintextKey);
}

export async function getOperatorStripeSecret(userId: string) {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("stripe_keys")
    .select("user_id, legacy_key_plaintext, ciphertext, iv_or_nonce, key_version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const secretRow = data as SecretRow;

  if (secretRow.ciphertext && secretRow.iv_or_nonce && secretRow.key_version !== null) {
    const plaintextKey = await decryptString({
      ciphertext: secretRow.ciphertext,
      ivOrNonce: secretRow.iv_or_nonce,
      keyVersion: secretRow.key_version,
    });
    await rotateSecretIfNeeded(userId, plaintextKey, secretRow.key_version);
    return plaintextKey;
  }

  return upgradeLegacySecret(secretRow);
}

export async function rotateOperatorStripeSecrets(targetVersion = currentKeyVersion()) {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("stripe_keys")
    .select("user_id, legacy_key_plaintext, ciphertext, iv_or_nonce, key_version");

  if (error) throw error;

  for (const row of (data ?? []) as SecretRow[]) {
    const plaintext = row.ciphertext && row.iv_or_nonce && row.key_version !== null
      ? await decryptString({
        ciphertext: row.ciphertext,
        ivOrNonce: row.iv_or_nonce,
        keyVersion: row.key_version,
      })
      : row.legacy_key_plaintext;

    if (!plaintext || row.key_version === targetVersion) continue;
    await saveOperatorStripeSecret(row.user_id, plaintext);
  }
}
