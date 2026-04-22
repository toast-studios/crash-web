import { CardId } from "../ui/Cards/Card";

type cardInfo = {
  cardSuit: "C" | "D" | "H" | "S";
  cardValue: string;
};

// todo define : J,Q,M
export const getCardTextFromCardId = (cardId: CardId): cardInfo => {
  if (!cardId) {
    // TODO: check if this is correct
    return {
      cardSuit: "C",
      cardValue: "",
    };
  }
  const cardValueNumber = Number(cardId.slice(1, 3));
  let cardValue = "";
  switch (cardValueNumber) {
    case 1:
      cardValue = "A";
      break;
    case 11:
      cardValue = "J";
      break;
    case 12:
      cardValue = "Q";
      break;
    case 13:
      cardValue = "K";
      break;

    default:
      cardValue = `${cardValueNumber}`;
      break;
  }
  const cardSuit = cardId.slice(0, 1);
  return {
    cardSuit: cardSuit as cardInfo["cardSuit"],
    cardValue,
  };
};
