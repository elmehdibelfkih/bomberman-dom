export class IdGenerator {
  static entityCounter = 0;
  static roomCounter = 0;
  static playerCounter = 0;

  /**
   * Generate unique entity ID
   * @returns {string} - Format: entity_timestamp_counter
   */
  static generateEntityId() {
    return `entity_${Date.now()}_${this.entityCounter++}`;
  }

  /**
   * Generate unique room ID
   * @returns {string} - Format: room_timestamp_counter
   */
  static generateRoomId() {
    return `room_${Date.now()}_${this.roomCounter++}`;
  }

  /**
   * Generate unique player ID
   * @returns {string} - Format: player_timestamp_random
   */
  static generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique bomb ID
   * @returns {string}
   */
  static generateBombId() {
    return `bomb_${Date.now()}_${this.entityCounter++}`;
  }

  /**
   * Generate unique powerup ID
   * @returns {string}
   */
  static generatePowerUpId() {
    return `powerup_${Date.now()}_${this.entityCounter++}`;
  }

  static reset() {
    this.entityCounter = 0;
    this.roomCounter = 0;
    this.playerCounter = 0;
  }
}