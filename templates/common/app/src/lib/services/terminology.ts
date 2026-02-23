/**
 * Terminology switching for social casino mode (stake.us compliance).
 *
 * When ?social=true, gambling-specific terms must be replaced per
 * the Stake Engine jurisdiction requirements table.
 */

const SOCIAL_TERMS: ReadonlyArray<[RegExp, string]> = [
  // Multi-word phrases first
  [/\bplacing bet\b/gi, 'Placing Play'],
  [/\bwin feature\b/gi, 'Play Feature'],
  [/\btotal bet\b/gi, 'Total Play'],
  [/\bbet amount\b/gi, 'Play Amount'],
  [/\bbuy bonus\b/gi, 'Get Bonus'],
  [/\bbonus buy\b/gi, 'Bonus'],
  [/\bplace your bets\b/gi, 'Come and Play'],
  [/\bat the cost of\b/gi, 'For'],
  [/\bcost of\b/gi, 'Can Be Played For'],
  [/\bpaid out\b/gi, 'Won'],
  [/\bpays out\b/gi, 'Won'],
  [/\bpay out\b/gi, 'Win'],
  // Single words
  [/\bbetting\b/gi, 'Playing'],
  [/\bbets\b/gi, 'Plays'],
  [/\bbet\b/gi, 'Play'],
  [/\bstake\b/gi, 'Play Amount'],
  [/\bwager\b/gi, 'Play'],
  [/\bgamble\b/gi, 'Play'],
  [/\bpayer\b/gi, 'Winner'],
  [/\bpays\b/gi, 'Wins'],
  [/\bpaid\b/gi, 'Won'],
  [/\bpay\b/gi, 'Win'],
  [/\bcash\b/gi, 'Coins'],
  [/\bmoney\b/gi, 'Coins'],
  [/\bdeposit\b/gi, 'Get Coins'],
  [/\bwithdraw\b/gi, 'Redeem'],
  [/\bpurchase\b/gi, 'Play'],
  [/\bbought\b/gi, 'Instantly Triggered'],
  [/\bbuy\b/gi, 'Play'],
  [/\brebet\b/gi, 'Respin'],
  [/\bcurrency\b/gi, 'Token'],
  [/\bcredits?\b/gi, 'Balance'],
  [/\bfund\b/gi, 'Balance'],
];

/**
 * Returns a term translator function.
 * In social mode, it replaces gambling terms. Otherwise, passthrough.
 */
export function createTerms(social: boolean): (text: string) => string {
  if (!social) return (text: string) => text;
  return (text: string) => {
    let result = text;
    for (const [pattern, replacement] of SOCIAL_TERMS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  };
}
