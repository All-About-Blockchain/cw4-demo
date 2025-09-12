/**
 * Test utility to verify device fingerprinting consistency
 * This can be used to test that the same device always generates the same wallet
 */

import {
  generateDeviceFingerprint,
  generateDeviceMnemonic,
} from './deviceFingerprint';
import * as bip39 from 'bip39';

export function testDeviceFingerprint() {
  console.log('=== Device Fingerprint Test ===');

  // Test 1: Generate fingerprint multiple times
  const fingerprint1 = generateDeviceFingerprint();
  const fingerprint2 = generateDeviceFingerprint();
  const fingerprint3 = generateDeviceFingerprint();

  console.log('Fingerprint 1:', fingerprint1);
  console.log('Fingerprint 2:', fingerprint2);
  console.log('Fingerprint 3:', fingerprint3);
  console.log(
    'Fingerprints match:',
    fingerprint1 === fingerprint2 && fingerprint2 === fingerprint3
  );

  // Test 2: Generate mnemonic multiple times
  const mnemonic1 = generateDeviceMnemonic();
  const mnemonic2 = generateDeviceMnemonic();
  const mnemonic3 = generateDeviceMnemonic();

  console.log('\nMnemonic 1:', mnemonic1);
  console.log('Mnemonic 2:', mnemonic2);
  console.log('Mnemonic 3:', mnemonic3);
  console.log(
    'Mnemonics match:',
    mnemonic1 === mnemonic2 && mnemonic2 === mnemonic3
  );

  // Test 3: Verify mnemonic format (should be 12 words)
  const words1 = mnemonic1.split(' ');
  const words2 = mnemonic2.split(' ');
  const words3 = mnemonic3.split(' ');

  console.log('\nWord count 1:', words1.length);
  console.log('Word count 2:', words2.length);
  console.log('Word count 3:', words3.length);
  console.log(
    'All have 12 words:',
    words1.length === 12 && words2.length === 12 && words3.length === 12
  );

  // Test 4: Verify BIP39 compliance
  const bip39Valid1 = bip39.validateMnemonic(mnemonic1);
  const bip39Valid2 = bip39.validateMnemonic(mnemonic2);
  const bip39Valid3 = bip39.validateMnemonic(mnemonic3);

  console.log('\nBIP39 Valid 1:', bip39Valid1);
  console.log('BIP39 Valid 2:', bip39Valid2);
  console.log('BIP39 Valid 3:', bip39Valid3);
  console.log('All BIP39 valid:', bip39Valid1 && bip39Valid2 && bip39Valid3);

  return {
    fingerprintConsistent:
      fingerprint1 === fingerprint2 && fingerprint2 === fingerprint3,
    mnemonicConsistent: mnemonic1 === mnemonic2 && mnemonic2 === mnemonic3,
    mnemonicFormat:
      words1.length === 12 && words2.length === 12 && words3.length === 12,
    bip39Compliant: bip39Valid1 && bip39Valid2 && bip39Valid3,
    fingerprint: fingerprint1,
    mnemonic: mnemonic1,
  };
}

// Make it available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testDeviceFingerprint = testDeviceFingerprint;
}
