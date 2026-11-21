import { describe, it, expect } from 'vitest';
import { generateOTP, hashOTP, verifyOTPHash, encryptOTP, decryptOTP } from './otp';

describe('OTP Cryptographic Utility', () => {
  it('generates a 4-digit numeric string', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOTP();
      expect(otp).toHaveLength(4);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThan(10000);
    }
  });

  it('correctly hashes and verifies matching OTPs with rideId salt', () => {
    const rideId = 'test-ride-uuid-123';
    const otp = '4829';
    const hash = hashOTP(otp, rideId);

    expect(verifyOTPHash(otp, rideId, hash)).toBe(true);
    expect(verifyOTPHash('4828', rideId, hash)).toBe(false);
    expect(verifyOTPHash('0000', rideId, hash)).toBe(false);
    expect(verifyOTPHash(otp, 'other-ride-id', hash)).toBe(false);
  });

  it('encrypts and decrypts OTP using AES-256-GCM', () => {
    const original = '7391';
    const encrypted = encryptOTP(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptOTP(encrypted);
    expect(decrypted).toBe(original);
  });

  it('rejects tampered ciphertexts in AES-256-GCM', () => {
    const encrypted = encryptOTP('1234');
    const [iv, tag, ciphertext] = encrypted.split(':');
    const tampered = `${iv}:${tag}:${ciphertext.slice(0, -2)}aa`;

    expect(() => decryptOTP(tampered)).toThrow();
  });
});
