/**
 * Device fingerprinting utility to generate a consistent device ID
 * This creates a deterministic seed based on browser and system characteristics
 */

import * as bip39 from 'bip39';

export function generateDeviceFingerprint(): string {
  const components: string[] = [];

  // Browser information
  if (typeof navigator !== 'undefined') {
    components.push(navigator.userAgent || '');
    components.push(navigator.language || '');
    components.push(navigator.platform || '');
    components.push(navigator.hardwareConcurrency?.toString() || '');
    components.push(navigator.maxTouchPoints?.toString() || '');

    // Screen information
    if (typeof screen !== 'undefined') {
      components.push(screen.width?.toString() || '');
      components.push(screen.height?.toString() || '');
      components.push(screen.colorDepth?.toString() || '');
      components.push(screen.pixelDepth?.toString() || '');
    }

    // Timezone
    try {
      components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch (e) {
      // Fallback for older browsers
      components.push(new Date().getTimezoneOffset().toString());
    }
  }

  // Add some additional entropy that's consistent per device
  if (typeof window !== 'undefined') {
    // Use localStorage availability as a characteristic
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      components.push('localStorage:true');
    } catch (e) {
      components.push('localStorage:false');
    }

    // Use sessionStorage availability
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      components.push('sessionStorage:true');
    } catch (e) {
      components.push('sessionStorage:false');
    }
  }

  // Combine all components and create a hash-like string
  const combined = components.join('|');

  // Simple hash function to create a consistent seed
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive hex string and pad to ensure consistent length
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');

  // Add some additional entropy by including the original string length
  const lengthHash = combined.length.toString(16).padStart(4, '0');

  return hexHash + lengthHash;
}

/**
 * Generate a deterministic mnemonic seed from device fingerprint
 * This creates a 12-word mnemonic that will be the same for the same device
 */
export function generateDeviceMnemonic(): string {
  const deviceId = generateDeviceFingerprint();

  // Create a deterministic entropy from the device ID
  // We need 128 bits (16 bytes) of entropy for a 12-word mnemonic
  const seed = deviceId + 'device-wallet-seed-deterministic';

  // Create a deterministic 128-bit entropy array
  const entropy = new Uint8Array(16);
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
  }

  // Fill the entropy array deterministically
  for (let i = 0; i < 16; i++) {
    hash = ((hash << 3) + i * 7 + seed.length) & 0xffffffff;
    entropy[i] = hash & 0xff;
  }

  // Generate BIP39 mnemonic from the entropy
  return bip39.entropyToMnemonic(Buffer.from(entropy).toString('hex'));
}
