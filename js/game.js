class Game {
  constructor() {
    this.hp = 20;
    this.weapon = null;
    this.lastMonsterKilled = 0;
    this.deck = new Deck();
    this.roomCards = []; // Contiendra les cartes physiques de la salle
    this.cardsPlayedThisRoom = 0;
    this.canFlee = true;
    this.deck.shuffle();
    this.initElements();
    this.potionUsedInThisRoom = false;
    this.sounds = {
      bgMusic: new Audio("Assets/sounds/musiqueAmbiance.mp3"),
      draw: new Audio("Assets/sounds/cartes_distrib.mp3"),
      click: new Audio("Assets/sounds/carte_clic.mp3")
    }
    this.sounds.bgMusic.loop = true;
    this.sounds.bgMusic.volume = 0.4;
    this.sounds.click.volume = 0.5;
  }
  initElements() {
    this.hpDisplay = document.getElementById("hp");
    this.weaponDisplay = document.getElementById("weapon");
    this.roomContainer = document.getElementById("room");
    this.nextRoomBtn = document.getElementById("next-room-btn");
    this.deckCountDisplay = document.getElementById("deck-count");
    this.nextRoomBtn.onclick = () => this.nextRoom();
  }
  start() {
    this.sounds.bgMusic.play().catch(e => console.log("Musique en attente d'interaction utilisateur"));
    this.loadRoom();
  }
  loadRoom() {
    // On filtre pour ne garder que la carte qui n'a pas été cliquée (non null)
    const remainingCards = this.roomCards.filter((card) => card !== null);
    // Si le deck est vide et qu'il n'y a rien à garder, c'est fini
    if (
      this.deck.cards.length === 0 &&
      this.roomCards.filter((c) => c !== null).length === 0
    ) {
      this.victory();
      return;
    }
    // On calcule combien de cartes il faut piocher pour revenir à 4
    const cardsToDraw = 4 - remainingCards.length;
    // Sécurité : on ne pioche que ce qui est disponible
    const actualToDraw = Math.min(cardsToDraw, this.deck.cards.length);
    const newCards = this.deck.draw(actualToDraw);
    // La nouvelle salle est l'ancien reste + les nouvelles cartes
    this.roomCards = [...remainingCards, ...newCards];
    this.cardsPlayedThisRoom = 0;
    this.potionUsedInThisRoom = false;
    this.sounds.draw.play();
    this.renderRoom();
    this.updateUI();
    // Si après avoir pioché tout est vide (cas rare), victoire
    if (this.roomCards.length === 0) {
      this.victory();
    }
  }
  renderRoom() {
    this.roomContainer.innerHTML = "";
    this.roomCards.forEach((card, index) => {
      const cardElement = document.createElement("div");
      if (card) {
        cardElement.classList.add("card");
        cardElement.dataset.suit = card.suit;

        if (card.value >= 10) {
          cardElement.classList.add("rare");
        } else if (card.value >= 7) {
          cardElement.classList.add("uncommon");
        }

        const fileName = this.getIconForSuit(card);

        // cardElement.innerHTML = `<span>${this.getCardLabel(card.value)}</span><span>${this.getSuitSymbol(card.suit)}</span>`;
        cardElement.innerHTML = `
          <div class="card-value">${this.getCardLabel(card.value)}</div>
          <img src="Assets/icons/${fileName}.png" class="card-icon" alt="${card.suit}">
          <div class="card-suit-mini">${this.getSuitSymbol(card.suit)}</div>
        `;
        cardElement.onclick = () => this.handleCardClick(index);
      } else {
        cardElement.classList.add("card", "empty");
      }
      this.roomContainer.appendChild(cardElement);
    });
  }
  getIconForSuit(card) {
    const v = card.value;
    const s = card.suit;
    // POTIONS (Coeurs)
    if (s === "hearts") {
      return v <= 6 ? "lightPotion" : "heightPotion"; 
    }
    // ARMES (Carreaux)
    if (s === "diamonds") {
      if (v <= 4) return "weaponSword";
      if (v <= 7) return "weaponAxe";
      if (v <= 10) return "weaponBow";
      return "weaponWand"; // Pour l'As
    }
    // MONSTRES (Trèfles et Piques)
    if (s === "clubs" || s === "spades") {
      if (v <= 5) return "monsterSpider";
      if (v <= 8) return "monsterSlim";
      if (v <= 11) return "monsterBone";
      return "monsterFire";
    }
  }
  handleCardClick(index) {
    const card = this.roomCards[index];
    if (!card) return;

    this.sounds.click.currentTime = 0;
    this.sounds.click.play();

    // 1. Trouver l'élément HTML correspondant
    const cardElements = this.roomContainer.querySelectorAll(".card");
    const targetElement = cardElements[index];

    // 2. Ajouter la classe d'animation de sortie
    targetElement.classList.add("fade-out");

    // 3. Attendre la fin de l'animation (400ms correspond au CSS)
    setTimeout(() => {
      // Appliquer la logique du jeu (soin, combat, etc.)
      switch (card.suit) {
        case "hearts":
          this.healPlayer(card.value);
          break;
        case "diamonds":
          this.equipWeapon(card.value);
          break;
        case "spades":
        case "clubs":
          this.fightMonster(card.value);
          break;
      }
      // Marquer l'emplacement comme vide et mettre à jour le reste
      this.roomCards[index] = null;
      this.cardsPlayedThisRoom++;
      // Vérifier d'abord si le joueur est mort
      if (this.hp <= 0) return;
      this.updateUI();
      this.renderRoom();
      // Vérifier la victoire SEULEMENT si on est vivant
      const remainingInRoom = this.roomCards.filter((c) => c !== null).length;
      if (this.deck.cards.length === 0 && remainingInRoom === 0) {
        this.victory();
      }
    }, 400);
  }
  healPlayer(value) {
    if (this.potionUsedInThisRoom) {
      this.displayMessage("Overdose ! La potion n'a aucun effet.");
      return;
    }
    const oldHp = this.hp;
    this.hp = Math.min(20, this.hp + value);
    this.potionUsedInThisRoom = true; // On bloque les prochaines potions de la salle
    this.displayMessage(`Soin : +${this.hp - oldHp} PV`);
  }
  equipWeapon(value) {
    this.weapon = value;
    this.lastMonsterKilled = 0;
    this.displayMessage(`Nouvelle arme : Force ${value}. Prête !`);
  }
  fightMonster(value) {
    let damage = value;
    if (this.weapon !== null) {
      if (this.lastMonsterKilled === 0 || value < this.lastMonsterKilled) {
        damage = Math.max(0, value - this.weapon);
        this.lastMonsterKilled = value;
        this.displayMessage(
          `Combat : ${damage} dégâts encaissés (Arme utilisée)`,
        );
      } else {
        this.displayMessage("L'arme est inefficace ! Dégâts maximum !");
      }
    } else {
      this.displayMessage(`Combat à mains nues : -${damage} PV`);
    }
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.updateUI();
      this.gameOver();
    }
  }
  updateUI() {
    this.hpDisplay.innerText = this.hp;
    this.weaponDisplay.innerText = this.weapon
      ? `Force ${this.weapon} (Dernier : ${this.lastMonsterKilled})`
      : "Aucune";
    if (this.deckCountDisplay) {
      this.deckCountDisplay.innerText = `Cartes restantes : ${this.deck.cards.length}`;
    }
    if (this.cardsPlayedThisRoom === 0 && this.canFlee) {
      this.nextRoomBtn.innerText = "Fuir la salle";
      this.nextRoomBtn.disabled = false;
    } else if (this.cardsPlayedThisRoom >= 3) {
      this.nextRoomBtn.innerText = "Salle suivante";
      this.nextRoomBtn.disabled = false;
    } else {
      this.nextRoomBtn.disabled = true;
    }
    if (this.hp <= 5) {
      this.hpDisplay.classList.add("danger");
    } else {
      this.hpDisplay.classList.remove("danger");
    }
  }
  nextRoom() {
    if (this.cardsPlayedThisRoom === 0) {
      // FUITE : on remet tout le contenu actuel sous le paquet
      const currentCards = this.roomCards.filter((c) => c !== null);
      this.deck.cards.push(...currentCards);
      this.roomCards = [];
      this.canFlee = false;
    } else {
      // SALLE NORMALE : on garde la canFlee pour la prochaine fois
      this.canFlee = true;
    }
    this.loadRoom();
  }
  getCardLabel(v) {
    if (v <= 10) return v;
    return { 11: "J", 12: "Q", 13: "K", 14: "A" }[v];
  }
  getSuitSymbol(s) {
    return { spades: "♠", clubs: "♣", hearts: "♥", diamonds: "♦" }[s];
  }
  displayMessage(text) {
    const log = document.getElementById("log-message");
    if (!log) return;
    log.innerText = text;
    log.style.color = "#f1c40f";
    setTimeout(() => (log.style.color = "white"), 500);
  }
  gameOver() {
    this.roomContainer.style.display = "flex";
    this.roomContainer.style.flexDirection = "column";
    // On vide la salle pour afficher le message
    this.roomContainer.innerHTML = `
        <div style="text-align:center; padding: 20px; background: rgba(231, 76, 60, 0.2); border-radius: 10px;">
            <h2 style="color:#e74c3c; font-size: 2rem;">GAME OVER</h2>
            <p>Le donjon a eu raison de vous...</p>
        </div>
    `;
    this.setupResetButton("Réessayer");
  }
  victory() {
    const score = this.hp * 10;
    this.roomContainer.style.display = "flex";
    this.roomContainer.style.flexDirection = "column";
    // On vide la salle pour afficher le message
    this.roomContainer.innerHTML = `
        <div style="margin:auto 0; text-align:center; padding:20px; background:rgba(39, 174, 96, 0.2); border-radius:10px;">
            <h2 style="color:#27ae60; font-size: 2rem;">VICTOIRE !</h2>
            <p style="margin: 10px 0;">Vous avez survécu au donjon.</p>
            <p style="font-size: 1.2rem;">Score final : <strong>${score} pts</strong></p>
            <p>Santé : ${this.hp}/20</p>
        </div>
    `;
    this.setupResetButton("Recommencer une partie");
  }
  setupResetButton(label) {
    this.nextRoomBtn.innerText = label;
    this.nextRoomBtn.disabled = false;
    this.nextRoomBtn.style.display = "block";
    this.nextRoomBtn.onclick = () => location.reload();
  }
}
