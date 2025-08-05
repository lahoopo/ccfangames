
const cors = "https://corsproxy.io/?";
const sheetID = '1YoTh5uHND8HW0BhM3jCuj3v4hwu1BllUZx0OwB-LioA'; // your real ID
const sheetsURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json`;
const gameList = document.getElementById('game-list');

let trueImageUrls = {}
let trueGameData = {}
let lastUniverseIds = []
const batchSize = 20

async function waitUntilFalse(variableRef) {
  while (variableRef()) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Check every 100ms
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
    return data.data; // array of thumbnail responses
  } catch (error) {
    console.error("Thumbnail fetch error:", error);
    return [];
  }
}

let currentPlaceId = null; // or currentUniverseId if using that

function redefinePlayButton() {
  const playButton = document.getElementById("play-button");
  playButton.addEventListener("click", () => {
    if (currentPlaceId) {
      const url = `https://www.roblox.com/games/${currentPlaceId}`;
      window.open(url, "_blank"); // Opens in a new tab
    }
  });
}
redefinePlayButton()

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
  item.style.padding = "0"; // Remove default padding
  item.style.border = "1px solid black";
  item.style.overflow = "hidden";

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = game.name;

  const img = document.createElement('img');
  img.src = thumb;
  img.alt = game.name;
  img.style.width = '100%';
  img.style.height = '100%';
  //img.style.border = "0px solid black";
  img.style.objectFit = "cover"; // Optional: crop to fit without distortion
  img.style.display = "block";   // Removes whitespace below the image

  item.appendChild(tooltip);
  item.appendChild(img);
  gameList.appendChild(item);
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

    const gameIDs = rows.map(row => row.c[4]?.v).filter(Boolean); // Only column A
    console.log(gameIDs); // Example output: [12345678, 98765432]

    // Now do something with the game IDs
    gameIDs.forEach(id => {
      console.log(`Game ID: ${id}`);
      lastUniverseIds.push(id)
      // You could then fetch data from Roblox API or use this to build game tiles dynamically
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
