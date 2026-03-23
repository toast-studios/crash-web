export type CardInfo = {
  x: number;
  y: number;
  cardIndex: number;
  columnIndex: number;
  coordinationIndex?: number;
};

export const opponentCardPlacementCoordinations: CardInfo[] = [];

export const actionButtonCoordinations: {
  x: number;
  y: number;
  buttonId: "hit" | "stand";
}[] = [];
