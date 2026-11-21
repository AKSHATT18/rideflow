import crypto from 'crypto';

const OTP_SECRET = process.env.JWT_SECRET || 'rideflow-secure-otp-secret-key-2026';
// Derive a 32-byte key for AES-256-GCM
const CIPHER_KEY = crypto.createHash('sha256').update(OTP_SECRET).digest();

/**
 * Generate a cryptographically secure 4-digit numeric OTP (1000 - 9999).
 */
export const generateOTP = (): string => {
  const code = crypto.randomInt(1000, 10000);
  return String(code);
};

/**
 * Compute an HMAC-SHA256 hash of the OTP salted with the rideId.
 * Stored in the database for secure constant-time verification.
 */
export const hashOTP = (otp: string, rideId: string): string => {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${rideId}:${otp.trim()}`)
    .digest('hex');
};

/**
 * Constant-time comparison between entered OTP and stored HMAC hash.
 * Protects against timing attacks.
 */
export const verifyOTPHash = (enteredOtp: string, rideId: string, storedHash: string): boolean => {
  if (!enteredOtp || !storedHash) return false;
  const computedHash = hashOTP(enteredOtp, rideId);
  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Encrypt the 4-digit OTP using AES-256-GCM so only the authorized passenger can retrieve it.
 * Format: iv:authTag:ciphertext (all hex encoded)
 */
export const encryptOTP = (otp: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CIPHER_KEY, iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt the AES-256-GCM encrypted OTP payload.
 */
export const decryptOTP = (encryptedPayload: string): string => {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted OTP payload');
  }
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', CIPHER_KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
