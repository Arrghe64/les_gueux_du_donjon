const SUITS = {
  SPADES: "spades", // Monstres
  CLUBS: "clubs", // Monstres
  HEARTS: "hearts", // Potions
  DIAMONDS: "diamonds", // Armes
};

class Deck {
  constructor() {
    this.cards = [];
    this.initialize();
  }

  initialize() {
    const suits = [SUITS.SPADES, SUITS.CLUBS, SUITS.HEARTS, SUITS.DIAMONDS];

    for (let suit of suits) {
      for (let value = 2; value <= 14; value++) {
        // RÈGLE : On retire les figures (11, 12, 13) pour les rouges (coeurs/carreaux)
        const isRedSuit = suit === SUITS.HEARTS || suit === SUITS.DIAMONDS;
        const isFaceCard = value >= 11 && value <= 13;

        if (isRedSuit && isFaceCard) {
          continue; // On ne l'ajoute pas au paquet
        }

        this.cards.push({ suit, value });
      }
    }
    console.log("Deck initialisé avec " + this.cards.length + " cartes.");
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(count) {
    return this.cards.splice(0, count);
  }
}
