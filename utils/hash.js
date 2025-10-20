import crypto from 'crypto';

export function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
