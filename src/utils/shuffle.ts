// utils/deck.ts
export type Card = string;

// Create full deck
export const createDeck = (): Card[] => {
  const suits = ['H', 'D', 'C', 'S'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Deal 13 cards per player and group them (4 sets + 1 extra)
export const dealCardsToPlayer = (numPlayers: number): Card[][][] => {
  const fullDeck = createDeck();
  const shuffled = shuffleDeck(fullDeck);

  const cardsPerPlayer = 13;
  const totalCards = numPlayers * cardsPerPlayer;

  const playerHands: Card[][][] = [];   // [player][set]

  for (let i = 0; i < numPlayers; i++) {
    const start = i * cardsPerPlayer;
    const playerCards = shuffled.slice(start, start + cardsPerPlayer);

    // Group into 4 sets of 3 + 1 leftover
    const sets: Card[][] = [
      playerCards.slice(0, 3),
      playerCards.slice(3, 6),
      playerCards.slice(6, 9),
      playerCards.slice(9, 12),
    ];

    const extraCard = playerCards.slice(12, 13); // 1 extra card

    playerHands.push([...sets, extraCard]);
  }

  return playerHands;
};