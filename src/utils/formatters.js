/**
 * Translates raw backend fraud engine codes into human-readable user messages.
 */
export const formatReasonToHuman = (code) => {
  const reasonMap = {
    'HIGH_AMOUNT_DEVIATION': 'Amount is significantly higher than your typical payment history.',
    'HIGH_SHORT_TERM_VELOCITY': 'Multiple transactions initiated within a very short time frame.',
    'HIGH_DAILY_FREQUENCY': 'Unusual daily transaction frequency detected on this account.',
    'HIGH_VALUE_NIGHT_TRANSFER': 'High-value transaction attempted during late-night hours (11 PM - 5 AM).',
    'LOW_TRUST_RECEIVER': 'Receiver account has a low trust rating or limited history.',
    'BLACKLISTED_ENTITY_DETECTED': 'Security alert: One of the accounts is flagged on national blocklists.',
    'DORMANT_ACCOUNT_SUDDEN_HIGH_VALUE': 'Sudden high-value activity on a previously inactive account.',
    'UNREGISTERED_COMMERCIAL_MISUSE': 'Potential commercial/merchant misuse on a personal account.',
  };

  if (reasonMap[code]) return reasonMap[code];
  if (code.startsWith('ROLE_LIMIT_EXCEEDED_')) {
    const role = code.replace('ROLE_LIMIT_EXCEEDED_', '');
    return `Transaction exceeds the maximum single-transfer limit for ${role} accounts.`;
  }
  return code; // Fallback to raw string if custom message
};
