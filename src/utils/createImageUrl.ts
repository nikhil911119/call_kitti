type Card = {
  suit: string;
  rank: string;
};

const createImageUrl = (suit: string, rank: string): string => {
  const suitLower = suit.toLowerCase();
  const rankStr = rank === "10" ? "10" : rank[0];
  return `../../assets/cards/${suitLower}_${rankStr}.png`;
};

export const createCardImageUrl = (card: Card): string => {
  return createImageUrl(card.suit, card.rank);
};

export default createCardImageUrl;
