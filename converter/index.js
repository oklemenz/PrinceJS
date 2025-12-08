"use strict";

const path = require("path");
const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");

const SIZE = 100;
const PrinceJS = {
  Level: {
    TYPE_DUNGEON: 0,
    TYPE_PALACE: 1,

    TILE_SPACE: 0,
    TILE_FLOOR: 1,
    TILE_GATE: 4,
    TILE_DROP_BUTTON: 6,
    TILE_LOOSE_BOARD: 11,
    TILE_RAISE_BUTTON: 15,
    TILE_WALL: 20,

    GUARD_NONE: "",
    GUARD_NORMAL: "guard",
    GUARD_FAT: "fatguard",
    GUARD_JAFFAR: "jaffar"
  }
};

const args = process.argv.slice(2);

(function () {
  const offset = args[1] >= 90 ? parseInt(args[1]) : 100;
  buildLevels(args[0], offset);
})();

function buildLevels(file, offset) {
  if (file) {
    buildLevelFile(file, offset);
  } else {
    const levels = readLevelDir("converter");
    for (const offset in levels) {
      const files = levels[offset];
      for (const file of files) {
        buildLevelFile(file, parseInt(offset));
      }
    }
  }
}

function buildLevelFile(file, offset) {
  const filePath = path.resolve(file);
  const dataXML = fs.readFileSync(filePath);
  const data = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
  }).parse(dataXML);
  const spec = determineSpec(data, file, offset);
  const level = transformLevel(spec);
  if (level.id >= 90) {
    writeLevel(level);
  } else {
    // eslint-disable-next-line no-console
    console.log("Level with id lower 90 is not (over)written: " + level.id);
  }
}

function readLevelDir(rootDir) {
  let levels = {};
  const rootPath = path.join(process.cwd(), rootDir);
  const dirs = fs.readdirSync(rootPath);
  for (const dir of dirs) {
    const offset = parseInt(dir, 10);
    const dirPath = path.join(rootPath, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.endsWith(".xml")) {
          levels[offset] = levels[offset] || [];
          levels[offset].push(path.join(dirPath, file));
        }
      }
    } else {
      if (dir.endsWith(".xml")) {
        const offset = 100;
        levels[offset] = levels[offset] || [];
        levels[offset].push(dirPath);
      }
    }
  }
  Object.keys(levels).forEach((key) => {
    levels[key].sort();
  });
  return levels;
}

function writeLevel(level) {
  const levelJSONPath = path.join(process.cwd(), `./assets/maps/custom/${level.file}.json`);
  if (fs.existsSync(levelJSONPath)) {
    let existingLevel;
    try {
      existingLevel = JSON.parse(fs.readFileSync(levelJSONPath));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reading file: " + levelJSONPath);
      throw err;
    }
    if (existingLevel.file === level.file) {
      mergeLevel(level, existingLevel);
    }
  }
  fs.writeFileSync(levelJSONPath, JSON.stringify(level, undefined, 2) + "\n");
  // eslint-disable-next-line no-console
  console.log(`Wrote level file '${levelJSONPath}'`);
}

function mergeLevel(level, existingLevel) {
  mergeProperties(level, existingLevel, ["name", "type"]);
  mergeProperties(level.prince, existingLevel.prince, [
    "turn",
    "offset",
    "sword",
    "cameraRoom",
    "specialEvents",
    "falling",
    "bias",
    "reverse",
    "danger"
  ]);
  for (let i = 0; i < level.room.length; i++) {
    for (let j = 0; j < (level.room[i].tile || []).length; j++) {
      mergeProperties(
        level.room[i].tile[j],
        existingLevel.room[i] && existingLevel.room[i].tile && existingLevel.room[i].tile[j],
        ["mute"]
      );
    }
  }
  for (let i = 0; i < level.guards.length; i++) {
    mergeProperties(level.guards[i], existingLevel.guards[i], [
      "type",
      "active",
      "visible",
      "bias",
      "reverse",
      "sneak"
    ]);
    if (level.guards[i].type !== PrinceJS.Level.GUARD_NORMAL) {
      level.guards[i].colors = 0;
    }
  }
}

function mergeProperties(data, existingData, properties) {
  if (data && existingData) {
    for (const property of properties) {
      data[property] = existingData[property] !== undefined ? existingData[property] : data[property];
    }
  }
}

function determineSpec(data, file, offset) {
  const number = parseInt(data.level.number, 10);
  const id = offset + number;
  const matrix = newArray(SIZE * SIZE);
  const rooms = newArray(SIZE);
  if (data.level.rooms.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No rooms found");
    process.exit(-1);
  }
  let posStart = convert2Pos(SIZE / 2, SIZE / 2);
  let start = posStart;
  let room = data.level.rooms.room.find((room) => {
    return room.number === data.level.prince.room;
  });
  if (!room) {
    // eslint-disable-next-line no-console
    console.log("Start room not found: " + data.level.prince.room);
    process.exit(-1);
  }
  const current = [room.number];
  while (current.length > 0) {
    const number = current.pop();
    room = data.level.rooms.room.find((room) => {
      return room.number === number;
    });
    if (!room) {
      // eslint-disable-next-line no-console
      console.log("Room not found: " + number);
      process.exit(-1);
    }
    let pos;
    if (start) {
      pos = start;
      rooms[number] = pos;
      start = null;
    } else {
      pos = rooms[number];
    }
    const num = parseInt(number, 10);
    if (matrix[pos] !== undefined && matrix[pos] !== num) {
      // eslint-disable-next-line no-console
      console.log("Level with broken rooms cannot be played correctly. Level: " + id + ", Room: " + number);
    }
    if (matrix[pos] === undefined || pos !== posStart) {
      matrix[pos] = num;
    }
    if (room.links) {
      if (room.links.left && room.links.left !== "0") {
        if (rooms[room.links.left] === undefined) {
          rooms[room.links.left] = pos - 1;
          current.push(room.links.left);
        }
      }
      if (room.links.right && room.links.right !== "0") {
        if (rooms[room.links.right] === undefined) {
          rooms[room.links.right] = pos + 1;
          current.push(room.links.right);
        }
      }
      if (room.links.up && room.links.up !== "0") {
        if (rooms[room.links.up] === undefined) {
          rooms[room.links.up] = pos - SIZE;
          current.push(room.links.up);
        }
      }
      if (room.links.down && room.links.down !== "0") {
        if (rooms[room.links.down] === undefined) {
          rooms[room.links.down] = pos + SIZE;
          current.push(room.links.down);
        }
      }
    }
  }
  const roomPos = Object.values(rooms).filter((pos) => pos !== undefined);
  const bounds = { x1: undefined, y1: undefined, x2: undefined, y2: undefined };
  for (const pos of roomPos) {
    const { x, y } = convert2Coord(pos);
    bounds.x1 = bounds.x1 === undefined ? x : Math.min(bounds.x1, x);
    bounds.y1 = bounds.y1 === undefined ? y : Math.min(bounds.y1, y);
    bounds.x2 = bounds.x2 === undefined ? x : Math.max(bounds.x2, x);
    bounds.y2 = bounds.y2 === undefined ? y : Math.max(bounds.y2, y);
  }
  if (bounds.x1 === undefined || bounds.y1 === undefined || (bounds.x2 === undefined && bounds.y2 === undefined)) {
    // eslint-disable-next-line no-console
    console.log("Room bounds are invalid");
    process.exit(-1);
  }
  const size = {
    width: bounds.x2 - bounds.x1 + 1,
    height: bounds.y2 - bounds.y1 + 1
  };
  const name = `level${id}`;
  const layoutMatrix = newArray2D(size, -1);
  for (let y = bounds.y1; y <= bounds.y2; y++) {
    for (let x = bounds.x1; x <= bounds.x2; x++) {
      const pos = convert2Pos(x, y);
      if (matrix[pos] > 0) {
        layoutMatrix[y - bounds.y1][x - bounds.x1] = matrix[pos];
      }
    }
  }
  const layout = layoutMatrix.reduce((result, line) => {
    return result.concat(line);
  }, []);
  let type = PrinceJS.Level.TYPE_DUNGEON;
  if ([4, 5, 6, 10, 11, 14].includes(number)) {
    type = PrinceJS.Level.TYPE_PALACE;
  }
  let guard = PrinceJS.Level.GUARD_NORMAL;
  if ([6].includes(number)) {
    guard = PrinceJS.Level.GUARD_FAT;
  } else if ([13].includes(number)) {
    guard = PrinceJS.Level.GUARD_JAFFAR;
  }
  return {
    id,
    number,
    name,
    size,
    type,
    guard,
    layout,
    rooms: data.level.rooms.room,
    events: data.level.events.event,
    prince: data.level.prince
  };
}

function transformLevel(spec) {
  const format = {
    id: spec.id,
    number: spec.number,
    file: spec.name,
    name: spec.name,
    size: spec.size,
    type: spec.type,
    room: [],
    guards: [],
    events: []
  };

  for (let j = 0; j < format.size.height; j++) {
    for (let i = 0; i < format.size.width; i++) {
      const n = j * format.size.width + i;
      format.room[n] = {};
      format.room[n].id = spec.layout[n];
      let next = 1;
      let eventID;
      if (spec.layout[n] !== -1) {
        // Copy tiles
        format.room[n].tile = [];
        for (let l = 0; l < 30; l++) {
          format.room[n].tile[l] = {};
          format.room[n].tile[l].element = parseInt(spec.rooms[spec.layout[n] - 1].tile[l].element, 10);
          format.room[n].tile[l].modifier = parseInt(spec.rooms[spec.layout[n] - 1].tile[l].modifier, 10);
          switch (format.room[n].tile[l].element & 0x1f) {
            case PrinceJS.Level.TILE_WALL:
              if (format.room[n].tile[l].modifier > 1) {
                format.room[n].tile[l].modifier = 0;
              }
              break;
            case PrinceJS.Level.TILE_SPACE:
              if ([124, 255].includes(format.room[n].tile[l].modifier)) {
                format.room[n].tile[l].modifier = 0;
              }
              break;
            case PrinceJS.Level.TILE_FLOOR:
              if ([3].includes(format.room[n].tile[l].modifier)) {
                format.room[n].tile[l].modifier = 2;
                break;
              }
              if ([124, 255].includes(format.room[n].tile[l].modifier)) {
                if (format.type === PrinceJS.Level.TYPE_DUNGEON) {
                  format.room[n].tile[l].modifier = 0;
                } else {
                  format.room[n].tile[l].modifier = 2;
                }
              }
              break;
            case PrinceJS.Level.TILE_LOOSE_BOARD:
              // Put modifier 1 for stuck board loose (modifier bit m: rrmccccc) Pag. 11 pdf POP Spec File format
              format.room[n].tile[l].modifier = (format.room[n].tile[l].element & 0x20) >> 5;
              break;
            case PrinceJS.Level.TILE_GATE:
              if ([2].includes(format.room[n].tile[l].modifier)) {
                format.room[n].tile[l].modifier = 0;
              }
              break;
            case PrinceJS.Level.TILE_DROP_BUTTON:
            case PrinceJS.Level.TILE_RAISE_BUTTON:
              eventID = format.room[n].tile[l].modifier;
              if (typeof format.events[eventID] === "undefined") {
                next = 1;
                while (next && eventID < 256) {
                  format.events[eventID] = {};
                  format.events[eventID].number = parseInt(spec.events[eventID].number, 10);
                  format.events[eventID].room = parseInt(spec.events[eventID].room, 10);
                  format.events[eventID].location = parseInt(spec.events[eventID].location, 10);
                  next = format.events[eventID].next = parseInt(spec.events[eventID].next, 10);
                  eventID++;
                }
              }
              break;
          }
          format.room[n].tile[l].element &= 0x1f;
        }
        // Push guards if any
        const guard = spec.rooms[spec.layout[n] - 1].guard;
        const location = parseInt(guard.location, 10);
        if (location > 0 && location <= 30) {
          const newGuard = {};
          newGuard.room = format.room[n].id;
          newGuard.location = location - 1;
          newGuard.skill = parseInt(guard.skill, 10);
          newGuard.colors = spec.guard === PrinceJS.Level.GUARD_NORMAL ? parseInt(guard.colors, 10) || 1 : 0;
          newGuard.type = spec.guard;
          newGuard.direction = parseInt(guard.direction, 10) === 1 ? 1 : -1;
          format.guards.push(newGuard);
        }
      }
    }
  }
  format.prince = {};
  format.prince.location = parseInt(spec.prince.location, 10) - 1;
  format.prince.room = parseInt(spec.prince.room, 10);
  format.prince.direction = parseInt(spec.prince.direction, 10) === 1 ? 1 : -1;
  if ([1, 13].includes(spec.number)) {
    format.prince.direction = -format.prince.direction;
  }
  if ([1, 7, 13].includes(spec.number)) {
    format.prince.turn = false;
  }
  if ([1].includes(spec.number)) {
    format.prince.offset = 7;
    format.prince.sword = false;
  }
  if ([7].includes(spec.number)) {
    format.prince.cameraRoom = 1;
  }
  return format;
}

function newArray(size, value) {
  return new Array(size).fill(value);
}

function newArray2D({ width, height }, value) {
  return new Array(height).fill(null).map(() => new Array(width).fill(value));
}

function convert2Pos(x, y) {
  return y * SIZE + x;
}

function convert2Coord(pos) {
  return { x: pos % SIZE, y: Math.trunc(pos / SIZE) };
}
