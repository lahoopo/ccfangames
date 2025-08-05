
  const games = [
    {
      name: "Bloxburg",
      icon: "https://via.placeholder.com/100?text=Bloxburg",
      description: "A city-building and life-simulation game."
    },
    {
      name: "Adopt Me",
      icon: "https://via.placeholder.com/100?text=Adopt+Me",
      description: "Raise pets and trade with friends."
    },
    {
      name: "Tower Defense",
      icon: "https://via.placeholder.com/100?text=Tower",
      description: "Defend your base from waves of enemies."
    }
  ];

  const gameList = document.getElementById('game-list');

  games.forEach(game => {
    const item = document.createElement('div');
    item.className = 'game-item';
    item.onclick = () => showInfo(game.name, game.description);

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = game.name;

    const img = document.createElement('img');
    img.src = game.icon;
    img.alt = game.name;
    img.style.width = '80px';
    img.style.height = '80px';
    img.style.borderRadius = '6px';

    item.appendChild(tooltip);
    item.appendChild(img);
    gameList.appendChild(item);
  });

  function showInfo(name, description) {
    const panel = document.getElementById('info-panel');
    panel.innerHTML = `
      <h2>${name}</h2>
      <p>${description}</p>
    `;
  }
