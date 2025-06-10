export default class RoundManager {
  static playerWins = 0;
  static enemyWins = 0;
  static round = 1;

  static reset() {
    this.playerWins = 0;
    this.enemyWins = 0;
    this.round = 1;
  }

  static nextRound() {
    this.round += 1;
  }
}
