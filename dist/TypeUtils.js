class TypeUtils {
  /**
   * Get type icon HTML
   */
  static getTypeIcon(typeName) {
    return `<img src="${this.getTypeIconPath(typeName)}" alt="${typeName}" class="type-icon">`;
  }
  /**
   * Get the path for a type icon
   */
  static getTypeIconPath(typeName) {
    const iconMap = {
      normal: "https://archives.bulbagarden.net/media/upload/2/22/GO_Normal.png",
      fire: "https://archives.bulbagarden.net/media/upload/0/0e/GO_Fire.png",
      water: "https://archives.bulbagarden.net/media/upload/a/aa/GO_Water.png",
      electric: "https://archives.bulbagarden.net/media/upload/4/4a/GO_Electric.png",
      grass: "https://archives.bulbagarden.net/media/upload/6/61/GO_Grass.png",
      ice: "https://archives.bulbagarden.net/media/upload/c/c6/GO_Ice.png",
      fighting: "https://archives.bulbagarden.net/media/upload/1/1e/GO_Fighting.png",
      poison: "https://archives.bulbagarden.net/media/upload/f/ff/GO_Poison.png",
      ground: "https://archives.bulbagarden.net/media/upload/2/21/GO_Ground.png",
      flying: "https://archives.bulbagarden.net/media/upload/8/87/GO_Flying.png",
      psychic: "https://archives.bulbagarden.net/media/upload/f/f2/GO_Psychic.png",
      bug: "https://archives.bulbagarden.net/media/upload/9/94/GO_Bug.png",
      rock: "https://archives.bulbagarden.net/media/upload/1/11/GO_Rock.png",
      ghost: "https://archives.bulbagarden.net/media/upload/a/a1/GO_Ghost.png",
      dragon: "https://archives.bulbagarden.net/media/upload/9/90/GO_Dragon.png",
      dark: "https://archives.bulbagarden.net/media/upload/7/73/GO_Dark.png",
      steel: "https://archives.bulbagarden.net/media/upload/d/d2/GO_Steel.png",
      fairy: "https://archives.bulbagarden.net/media/upload/a/ae/GO_Fairy.png"
    };
    return iconMap[typeName] || "";
  }
  /**
   * Get type colors for background and border
   */
  static getTypeColor(typeName) {
    const colors = {
      normal: { background: "#A8A878", border: "#8A8A59" },
      fire: { background: "#F08030", border: "#C06020" },
      water: { background: "#6890F0", border: "#4070D0" },
      electric: { background: "#F8D030", border: "#C8A020" },
      grass: { background: "#78C850", border: "#58A030" },
      ice: { background: "#98D8D8", border: "#70B8B8" },
      fighting: { background: "#C03028", border: "#902018" },
      poison: { background: "#A040A0", border: "#803080" },
      ground: { background: "#E0C068", border: "#C0A048" },
      flying: { background: "#A890F0", border: "#8870D0" },
      psychic: { background: "#F85888", border: "#C83868" },
      bug: { background: "#A8B820", border: "#889818" },
      rock: { background: "#B8A038", border: "#988028" },
      ghost: { background: "#705898", border: "#504078" },
      dragon: { background: "#7038F8", border: "#5020C8" },
      dark: { background: "#705848", border: "#504038" },
      steel: { background: "#B8B8D0", border: "#9898B0" },
      fairy: { background: "#EE99AC", border: "#D0708C" }
    };
    return colors[typeName] || { background: "#dff0cb", border: "#4ecf87" };
  }
  /**
   * Format types array to uppercase string
   */
  static formatTypesLabel(types) {
    return types.map((typeInfo) => typeInfo.type.name.toUpperCase()).join(" / ");
  }
  /**
   * Apply type-based background styling to page
   */
  static applyTypeBackground(types, cardFrameElement = null) {
    const primaryType = types[0].type.name;
    const typeColor = this.getTypeColor(primaryType);
    document.body.style.backgroundColor = typeColor.background;
    if (cardFrameElement) {
      cardFrameElement.style.borderColor = typeColor.border;
    }
  }
  /**
   * Create type icons HTML for a Pokemon's types
   */
  static createTypeIconsHTML(types, useContainer = false) {
    return types.map((typeInfo) => {
      const typeName = typeInfo.type.name;
      const icon = this.getTypeIcon(typeName);
      return useContainer ? `<span class="type-icon-container ${typeName}">${icon}</span>` : icon;
    }).join("");
  }
}
export {
  TypeUtils as T
};
//# sourceMappingURL=TypeUtils.js.map
