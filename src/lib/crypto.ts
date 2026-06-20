// Passphrase-based encryption for local backups (AES-GCM + PBKDF2).
// 100 % client-side via the Web Crypto API — no dependency, no server.

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 150_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedEnvelope {
  daorEncrypted: true;
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

export async function encryptString(plaintext: string, passphrase: string): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(plaintext));
  return {
    daorEncrypted: true,
    v: 1,
    salt: bufToB64(salt.buffer),
    iv: bufToB64(iv.buffer),
    data: bufToB64(ciphertext),
  };
}

export async function decryptString(env: EncryptedEnvelope, passphrase: string): Promise<string> {
  const salt = b64ToBuf(env.salt);
  const iv = b64ToBuf(env.iv);
  const key = await deriveKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, b64ToBuf(env.data) as BufferSource);
    return dec.decode(plain);
  } catch {
    throw new Error('Passphrase incorrecte ou fichier corrompu.');
  }
}

export function isEncryptedEnvelope(obj: unknown): obj is EncryptedEnvelope {
  return Boolean(obj) && typeof obj === 'object' && (obj as { daorEncrypted?: boolean }).daorEncrypted === true;
}
