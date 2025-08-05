
const cors = "https://corsproxy.io/?";
const sheetID = '1YoTh5uHND8HW0BhM3jCuj3v4hwu1BllUZx0OwB-LioA';
const sheetsURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json`;
const gameList = document.getElementById('game-list');

let trueImageUrls = {}
let trueGameData = {}
let allButtons = {}
let lastUniverseIds = []
const batchSize = 30

async function waitUntilFalse(variableRef) {
  while (variableRef()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

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
      return response.json()
    })
    .then(data => {
      console.log("Game data:", data);
      return data.data
    })
    .catch(error => {
      console.error("Fetch error:", error);
      return null
    });
}

async function thumbnailBatchEndpoint(universeIDs) {
  const payload = universeIDs.map(id => ({
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
    return data.data;
  } catch (error) {
    console.error("Thumbnail fetch error:", error);
    return [];
  }
}

let sortedOption = "popular"

function resortList() {
  let arrayToSort = Object.values(trueGameData)
  if (sortedOption === "popular") {
    arrayToSort.sort((a, b) => b.visits - a.visits);
  } else if (sortedOption === "recent") {
    arrayToSort.sort((a, b) => new Date((b.created).substring(0, 10)).getTime() - new Date((a.created).substring(0, 10)).getTime());
  }
  arrayToSort.forEach(game => {
    if (allButtons[game.id]) {
      gameList.appendChild(allButtons[game.id])
    }
  });
}

document.getElementById("sort-options").addEventListener("change", (e) => {
  sortedOption = e.target.value;
  resortList();
});

let currentPlaceId = null;

function redefinePlayButton() {
  const playButton = document.getElementById("play-button");
  playButton.addEventListener("click", () => {
    if (currentPlaceId) {
      const url = `https://www.roblox.com/games/${currentPlaceId}`;
      window.open(url, "_blank");
    }
  });
}

function showInfo(game) {
  const panel = document.getElementById('info-panel');
  currentPlaceId = game.rootPlaceId
  panel.innerHTML = `
      <h2>${game.name}</h2>
      <h5>Creator: ${game.creator.name}</h5>
      <h5>Visits: ${game.visits}</h5>
      <h5>Favorites: ${game.favoritedCount}</h5>
      <h5>Created: ${(game.created).substring(0, 10)}</h5>
      <h5>Updated: ${(game.updated).substring(0, 10)}</h5>
      <p>${game.description}</p>
      <button id="play-button">Play</button>
    `;
  redefinePlayButton()
}

function buttonSetup(id) {
  let game = trueGameData[id]
  let thumb = trueImageUrls[id]
  const item = document.createElement('div');
  item.className = 'game-item';
  item.onclick = () => showInfo(game);
  item.style.padding = "0";
  item.style.border = "1px solid black";

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = game.name;
  tooltip.style.zIndex = "999"

  const img = document.createElement('img');
  img.src = thumb;
  img.alt = game.name;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.borderRadius = '11px'
  img.style.objectFit = "cover";
  img.style.display = "block";
  img.style.border = "1px solid black";

  item.appendChild(tooltip);
  item.appendChild(img);
  gameList.appendChild(item);
  allButtons[id] = item
  resortList()
}

let alreadyBatching = false
function batchData() {
  if (alreadyBatching) { return }
  alreadyBatching = true
  let uniIds = []
  let otherBatch = false
  for (let i = 0; i < Math.min(lastUniverseIds.length, batchSize); i++) {
    uniIds.push(lastUniverseIds.shift())
  }
  thumbnailBatchEndpoint(uniIds)
    .then(thumbnails => {
      thumbnails.forEach(thumb => {
        console.log(`Game ${thumb.targetId} =>`, thumb.imageUrl);
        trueImageUrls[thumb.targetId] = thumb.imageUrl
        if (otherBatch) { buttonSetup(thumb.targetId) }
      });
      if (otherBatch) { alreadyBatching = false } else { otherBatch = true }
    });
  gameBatchEndpoint(uniIds).then(
    games => {
      games.forEach(game => {
        console.log(`Game (2) ${game.id} =>`, game.name);
        trueGameData[game.id] = game
        if (otherBatch) { buttonSetup(game.id) }
      });
      if (otherBatch) { alreadyBatching = false } else { otherBatch = true }
    })
}

fetch(sheetsURL)
  .then(response => response.text())
  .then(text => {
    const json = JSON.parse(text.substring(47).slice(0, -2)); // Google adds garbage before/after
    const rows = json.table.rows;

    const gameIDs = rows.map(row => row.c[4]?.v).filter(Boolean); // One column
    console.log(gameIDs);

    gameIDs.forEach(id => {
      console.log(`Game ID: ${id}`);
      lastUniverseIds.push(id)
    });
    (async () => {
      while (lastUniverseIds.length > 0) {
        console.log("Waiting...");
        batchData()
        await waitUntilFalse(() => alreadyBatching);
        console.log("Done waiting!");
      }
    })();
  })
  .catch(err => console.error('Failed to fetch sheet:', err));

