/**
 * Animation timing configuration for game card animations and transitions
 */
export const ANIMATION_CONFIG = {
  /**
   * Phase Two - Dealer card animations during COLUMN_RESULT
   */
  PHASE_TWO_DEALER: {
    /**
     * Delay between subsequent dealer cards when multiple cards are dealt
     * during column result reveal (in milliseconds)
     */
    CARD_SEQUENCE_DELAY: 1000,
  },
} as const;
