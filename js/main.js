
const cors = "https://corsproxy.io/?";
const sheetID = '1YoTh5uHND8HW0BhM3jCuj3v4hwu1BllUZx0OwB-LioA'; // your real ID
const sheetsURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json`;
const gameList = document.getElementById('game-list');

let trueImageUrls = {}
let trueGameData = {}
let lastUniverseIds = []
const batchSize = 20

function universeIdEndpoint(placeID) {
  return fetch(cors + `https://apis.roblox.com/universes/v1/places/${placeID}/universe`)
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok (universe)");
      return response.json()
    })
    .then(data => {
      console.log("Universe data:", data);
      return data.universeId
    })
    .catch(error => {
      console.error("Fetch error:", error);
      return null
    });
}

function gameBatchEndpoint(universeIDs) {
  return fetch(cors + `https://games.roblox.com/v1/games?universeIds=${universeIDs.join(",")}`)
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok (game batch)");
      return null
    })
    .then(data => {
      console.log("Game data:", data);
      return data
    })
    .catch(error => {
      console.error("Fetch error:", error);
      return null
    });
}

async function thumbnailBatchEndpoint(universeIDs) {
  const payload = placeIds.map(id => ({
    requestId: `${id}::GameIcon:256x256:webp:regular:`,
    type: "GameIcon",
    targetId: id,
    token: "",
    format: "webp",
    size: "256x256",
    version: ""
  }));

  try {
    const response = await fetch(cors + "https://thumbnails.roblox.com/v1/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Failed to fetch thumbnails");

    const data = await response.json();
    return data.data; // array of thumbnail responses
  } catch (error) {
    console.error("Thumbnail fetch error:", error);
    return [];
  }
}


function showInfo(name, description) {
  const panel = document.getElementById('info-panel');
  panel.innerHTML = `
      <h2>${name}</h2>
      <p>${description}</p>
    `;
}

function buttonSetup() {
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
}

let alreadyBatching = false
function batchData() {
  if (alreadyBatching) { return }
  alreadyBatching = true
  let uniIds = []
  let otherBatch = false
  for (let i = 0; i < lastUniverseIds.length; i++) {
    uniIds.push(lastUniverseIds.shift())
  }
  thumbnailBatchEndpoint(uniIds)
  .then(thumbnails => {
    thumbnails.forEach(thumb => {
      console.log(`Game ${thumb.targetId} =>`, thumb.imageUrl);
      trueImageUrls[thumb.targetId] = thumb.imageUrl
      if (otherBatch) { alreadyBatching = false } else { otherBatch = true }
    });
  });
  gameBatchEndpoint(universeIDs).then(
    games => {
    games.forEach(game => {
      console.log(`Game (2) ${game.id} =>`, game.name);
      trueGameData[game.id] = game
      if (otherBatch) { alreadyBatching = false } else { otherBatch = true }
    });
  })
}

fetch(sheetsURL)
  .then(response => response.text())
  .then(text => {
    const json = JSON.parse(text.substring(47).slice(0, -2)); // Google adds garbage before/after
    const rows = json.table.rows;

    const gameIDs = rows.map(row => row.c[0]?.v).filter(Boolean); // Only column A
    console.log(gameIDs); // Example output: [12345678, 98765432]

    // Now do something with the game IDs
    gameIDs.forEach(id => {
      console.log(`Game ID: ${id}`);
      universeIdEndpoint(id).then(universeId => {
        if (universeId) {
          lastUniverseIds.push(universeId)
          if (lastUniverseIds.length >= batchSize) {
            batchData()
          }
        }
      });
      // You could then fetch data from Roblox API or use this to build game tiles dynamically
    });
  })
  .catch(err => console.error('Failed to fetch sheet:', err));
