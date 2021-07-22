//TODO player levelling upjmjyhu
//TODO LEVELS - including stairs
//TODO HIDDEN AREAS - hiding
//TODO enemy damage based on level
//TODO add timeout to room creation so that it does not loop infinitely when it cannot find a suitable home for a room
//TODO fix weapons so that higher tier weapons don't degrade name to lower tier ones
//TODO change Grid addItem/addPlayer/addEnemy etc to be one function that pulls the items types
//TODO general reorganization

const MAX_ROOMS = 8;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 40;
const MIN_ROOM_WIDTH = 6;
const MAX_ROOM_WIDTH = 15;
const MIN_ROOM_HEIGHT = 5;
const MAX_ROOM_HEIGHT = 12;
const TILE_WALL = 1;
const TILE_TUNNEL = 0;
const TILE_ITEM = 2;
const TILE_PLAYER = 3;
const TILE_ENEMY = 4;
const ITEM_HEALTHPACK = 0;
const ITEM_WEAPON = 1;
const MAX_ITEMS = MAX_ROOMS * 2;
const MIN_ITEMS = MAX_ROOMS;
const MAX_RATIO_WEAPONS = 40;
const MIN_RATIO_WEAPONS = 20;
const MAX_ENEMIES = MAX_ROOMS + 3;
const MIN_ENEMIES = MAX_ROOMS;
const HEALTHPACK_RESTORE_PERCENT = 20;
const BASE_PLAYER_HEALTH = 30;
const BASE_PLAYER_VITALITY = 10;
const VITALITY_INCREASE_PER_LEVEL = 5;

let rooms = [];
let items = undefined;
let v_corridors = [];
let h_corridors = [];
let player = undefined;
let messages = [];
let newMessageAvailable = false;
let level = 1;
let enemies = undefined;

function LogMessage(message) {
  if (typeof message == "string") {
    messages.push(message);
    newMessageAvailable = true;
  }
}

class Weapon {
  constructor({ name = "Rusty Dagger", damage = 1 } = {}) {
    this.name = name;
    this.damage = damage;
    this.baseDamage = damage;
  }
}

class Enemy {
  constructor({
    name = "Unidentified Creature",
    health = 10,
    damage = 1,
    experience = 5,
    position = { x: 0, y: 0 },
  } = {}) {
    this.name = name;
    this.health = health;
    this.damage = damage;
    this.experience = experience;
    this.position = position;
  }
}

class Enemies {
  constructor(grid) {
    this._enemies = [];
    this.grid = grid;
  }
  AddEnemy(enemy) {
    this._enemies.push(enemy);
  }
  GetEnemyAtPosition(position) {
    for (let i = 0; i < this._enemies.length; i++) {
      if (
        position.x == this._enemies[i].position.x &&
        position.y == this._enemies[i].position.y
      ) {
        let enemy = this._enemies[i];
        return enemy;
      }
    }
    console.error(
      "No enemy at position: (" + position.x + "," + position.y + ")"
    );
    return undefined;
  }
  KillEnemy(enemyIndex) {
    let enemy = this._enemies.splice(enemyIndex, 1)[0];
    this.grid.clearPosition(enemy.position);
  }
  UpdateEnemies(grid) {
    const ENEMY_CHANCE_MOVE = 30;
    for (let i = 0; i < this._enemies.length; i++) {
      let willEnemyMove = Math.random() * 100;
      if (willEnemyMove >= ENEMY_CHANCE_MOVE) {
        //only moves if roll is higher than ENEMY_CHANCE_MOVE
        let enemy = this._enemies[i];
        let direction = Math.floor(Math.random() * 4);
        let newPos = new Point({ x: enemy.position.x, y: enemy.position.y });
        switch (direction) {
          case 0: //north
            newPos.y -= 1;
            break;
          case 1: //east
            newPos.x += 1;
            break;
          case 2: //south
            newPos.y += 1;
            break;
          case 3: //west
            newPos.x -= 1;
            break;
          default:
            console.error(
              "did not move enemy correctly - direction out of bounds"
            );
        }
        if (grid.getTile(newPos) == TILE_TUNNEL) {
          grid.clearPosition(enemy.position);
          grid.placeEnemy(newPos);
          enemy.position = newPos;
        }
      }
    }
  }
  AttackEnemyAtPosition(position, player) {
    for (let i = 0; i < this._enemies.length; i++) {
      if (
        position.x == this._enemies[i].position.x &&
        position.y == this._enemies[i].position.y
      ) {
        let enemy = this._enemies[i];
        enemy.health -= player.getDamage();
        if (enemy.health <= 0) {
          enemy.damage = 0;
          this.KillEnemy(i);
        }
        return enemy;
      }
    }
    console.error(
      "No enemy at position: (" + position.x + "," + position.y + ")"
    );
    return undefined;
  }
}

function getRandomWeapon(level = 1) {
  //needs rework to actually get a random weapon
  const CHANCE_UPGRADE1TIER = 25;
  const CHANCE_UPGRADE2TIER = 15;
  const CHANCE_UPGRADE3TIER = 5;
  const MAX_TIER = 4;
  let weaponsLevel1 = [
    new Weapon({ name: "Butter Knife", damage: 1 }),
    new Weapon({ name: "Mouse Trap", damage: 1 }),
    new Weapon({ name: "Plank of Wood", damage: 2 }),
  ];
  let weaponsLevel2 = [
    new Weapon({ name: "Steak Knife", damage: 2 }),
    new Weapon({ name: "Cleaver", damage: 3 }),
    new Weapon({ name: "Silver Dagger", damage: 2 }),
  ];
  let weaponsLevel3 = [
    new Weapon({ name: "Short Sword", damage: 4 }),
    new Weapon({ name: "Woodcutter's Axe", damage: 3 }),
    new Weapon({ name: "Blunt Mace", damage: 3 }),
  ];
  let weaponsLevel4 = [
    new Weapon({ name: "Greatsword", damage: 10 }),
    new Weapon({ name: "Knight's Polearm", damage: 8 }),
    new Weapon({ name: "Broadsword", damage: 8 }),
  ];
  let weaponsList = [
    weaponsLevel1,
    weaponsLevel2,
    weaponsLevel3,
    weaponsLevel4,
  ];
  let qualityRoll = Math.random() * 100;
  let weapon = undefined;
  let bonus = 0;
  if (qualityRoll < CHANCE_UPGRADE3TIER) {
    bonus = 3;
  } else if (qualityRoll < CHANCE_UPGRADE2TIER) {
    bonus = 2;
  } else if (qualityRoll < CHANCE_UPGRADE1TIER) {
    bonus = 1;
  }
  let weaponTier = weaponsList[Math.min(level + bonus, MAX_TIER) - 1];
  let weaponBase = weaponTier[Math.floor(Math.random() * weaponTier.length)];
  weapon = new Weapon(weaponBase);
  return weapon;
}

class Item {
  constructor(type = ITEM_HEALTHPACK, position = { x: 0, y: 0 }, weapon) {
    this.type = type;
    this.position = position;
    if (weapon) {
      this.weapon = weapon;
    }
  }
}

class Items {
  constructor() {
    this._items = [];
  }
  AddItem(item) {
    this._items.push(item);
  }
  PickupItem(position) {
    for (let i = 0; i < this._items.length; i++) {
      if (
        position.x == this._items[i].position.x &&
        position.y == this._items[i].position.y
      ) {
        let item = this._items.splice(i, 1)[0];
        return item;
      }
    }
    console.error(
      "No item at position: (" + position.x + "," + position.y + ")"
    );
    return undefined;
  }
  PositionCollidesWithItem({ x, y }) {
    for (let i = 0; i < this._items.length; i++) {
      if (x == this._items[i].position.x && y == this._items[i].position.y) {
        return true;
      }
    }
    return false;
  }
}

class Player {
  constructor({ x, y }) {
    this.position = { x, y };
    this._lastMoveValid = false;
    this.xp = 0;
    this.level = 1;
    this.weapon = new Weapon();
    this.health = BASE_PLAYER_HEALTH;
    this.maxHealth = BASE_PLAYER_HEALTH;
    this.vitality = BASE_PLAYER_VITALITY;
  }
  addExperience(exp) {
    if (!isNaN(exp)) {
      this.xp += exp;
    }
  }
  getMaxHealth() {
    return this.maxHealth;
  }
  getDamage() {
    return this.weapon.damage;
  }
  levelUp() {
    this.level += 1;
    this.maxHealth += this.vitality;
    this.vitality += VITALITY_INCREASE_PER_LEVEL;
  }
  wasLastMoveValid() {
    return this._lastMoveValid;
  }
  Move(direction, grid) {
    let moved = false;
    this._lastMoveValid = false;
    let newPos = undefined;
    switch (direction) {
      case "west":
        newPos = { x: this.position.x - 1, y: this.position.y };
        break;
      case "east":
        newPos = { x: this.position.x + 1, y: this.position.y };
        break;
      case "north":
        newPos = { x: this.position.x, y: this.position.y - 1 };
        break;
      case "south":
        newPos = { x: this.position.x, y: this.position.y + 1 };
        break;
      default:
        console.error('Invalid direction "' + direction + '"');
        return false;
    }
    if (grid.getTile(newPos) == TILE_TUNNEL) {
      grid.clearPosition(this.position);
      grid.updatePlayerPosition(newPos);
      this.position = newPos;
      moved = true;
      this._lastMoveValid = true;
    } else if (grid.getTile(newPos) == TILE_ITEM) {
      grid.clearPosition(this.position);
      grid.updatePlayerPosition(newPos);
      this.position = newPos;
      moved = true;
      let item = items.PickupItem(newPos);
      if (item.type == ITEM_HEALTHPACK) {
        let newHealth =
          this.health +
          Math.round((this.maxHealth * HEALTHPACK_RESTORE_PERCENT) / 100);
        newHealth = Math.min(this.maxHealth, newHealth);
        LogMessage(
          "You picked up a health pack, healing " +
            (newHealth - this.health) +
            " health." +
            (newHealth - this.health == 0 ? " What a waste." : "")
        );
        this.health = newHealth;
      } else if (item.type == ITEM_WEAPON) {
        LogMessage(
          "You picked up a " +
            item.weapon.name +
            " and use your ingenuity to improve it with your previous weapon!"
        );
        item.weapon.damage += this.weapon.damage;
        this.weapon = item.weapon;
      }
    } else if (grid.getTile(newPos) == TILE_ENEMY) {
      let enemy = enemies.AttackEnemyAtPosition(newPos, this);
      let message =
        "You attack a " +
        enemy.name +
        " and do " +
        this.getDamage() +
        " damage";
      if (enemy.health <= 0) {
        message +=
          ", killing it. You gain " + enemy.experience + " experience!";
        grid.clearPosition(this.position);
        grid.updatePlayerPosition(newPos);
        this.position = newPos;
        this.addExperience(enemy.experience);
        moved = true;
        this._lastMoveValid = true;
      } else {
        this.health -= enemy.damage;
        message +=
          ". The " +
          enemy.name +
          " attacks you, doing " +
          enemy.damage +
          " damage to you.";
      }
      LogMessage(message);
    }
    this._lastMoveValid = true;
    enemies.UpdateEnemies(grid);
    return moved;
  }
}

function IsPointInBounds({ x, y }) {
  //returns 0 if false, 1 if true, -1 if NaN
  let retVal = -1;
  if (!isNaN(x) && !isNaN(y)) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      retVal = 0;
    } else {
      retVal = 1;
    }
  }
  return retVal;
}

class Grid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.clear();
  }
  clear() {
    this.tiles = [];
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        this.tiles.push(TILE_WALL);
      }
    }
  }
  createMap() {
    let renderedMap = [];
    for (let y = 0; y < this.height; y++) {
      renderedMap.push([]);
      for (let x = 0; x < this.width; x++) {
        renderedMap[y].push(this.tiles[y * MAP_WIDTH + x]);
      }
    }
    return renderedMap;
  }
  updatePlayerPosition(position) {
    this.tiles[position.y * MAP_WIDTH + position.x] = TILE_PLAYER;
  }
  clearPosition(position) {
    this.tiles[position.y * MAP_WIDTH + position.x] = TILE_TUNNEL;
  }
  placeItem(position) {
    this.tiles[position.y * MAP_WIDTH + position.x] = TILE_ITEM;
  }
  updateTile(position, tileType) {
    this.tiles[position.y * MAP_WIDTH + position.x] = tileType;
  }
  placeEnemy(position) {
    this.updateTile(position, TILE_ENEMY);
  }
  getTile(position) {
    let ret = undefined;
    if (
      position.x < 1 ||
      position.x >= MAP_WIDTH ||
      position.y < 1 ||
      position.y >= MAP_HEIGHT
    ) {
      console.error(
        "Position (" + position.x + "," + position.y + ") is out of bounds"
      );
      return null;
    }
    return this.tiles[position.y * MAP_WIDTH + position.x];
  }
}

class Point {
  constructor({ x, y }) {
    if (IsPointInBounds({ x, y })) {
      this.x = x;
      this.y = y;
    } else {
      console.error("Point not in bounds. X:" + x + " Y:" + y + ".");
    }
  }
  collidesWithPoint({ x, y }) {
    if (this.x == x && this.y == y) {
      return true;
    } else {
      return false;
    }
  }
}

class Room {
  constructor(x, y, width, height) {
    this.topLeft = new Point({ x, y });
    this.bottomRight = new Point({ x: x + width, y: y + height });
    this.width = width;
    this.height = height;
    this.center = new Point({
      x: Math.floor((x * 2 + width) / 2),
      y: Math.floor((y * 2 + height) / 2),
    });
  }
  intersectsWith(otherRoom) {
    return (
      this.topLeft.x <= otherRoom.bottomRight.x &&
      this.bottomRight.x >= otherRoom.topLeft.x &&
      this.topLeft.y <= otherRoom.bottomRight.y &&
      this.bottomRight.y >= otherRoom.topLeft.y
    );
  }
  getRandomPositionInside() {
    let x = Math.floor(
      Math.random() * (this.bottomRight.x - 1 - (this.topLeft.x + 1)) +
        this.topLeft.x +
        1
    );
    let y = Math.floor(
      Math.random() * (this.bottomRight.y - 1 - (this.topLeft.y + 1)) +
        this.topLeft.y +
        1
    );
    return new Point({ x, y });
  }
}

class HCorridor extends Room {
  constructor({ x1, x2, y }) {
    let left = Math.min(x1, x2);
    let width = Math.max(x1, x2) - left;
    super(left, y, width, 1);
    this.corridorType = "Horizontal";
  }
}

class VCorridor extends Room {
  constructor({ y1, y2, x }) {
    let top = Math.min(y1, y2);
    let height = Math.max(y1, y2) - top + 1;
    super(x, top, 1, height);
    this.corridorType = "Vertical";
  }
}

function createRoom(room, grid) {
  for (let y = room.topLeft.y; y < room.topLeft.y + room.height; y++) {
    for (let x = room.topLeft.x; x < room.topLeft.x + room.width; x++) {
      grid.tiles[y * MAP_WIDTH + x] = TILE_TUNNEL;
    }
  }
  //grid.tiles[room.center.x + room.center.y * MAP_WIDTH] = 2;
}

function placeRooms(grid) {
  rooms = [];
  v_corridors = [];
  h_corridors = [];
  grid.clear();
  for (let i = 0; i < MAX_ROOMS; i++) {
    let width =
      MIN_ROOM_WIDTH +
      Math.floor(Math.random() * (MAX_ROOM_WIDTH - MIN_ROOM_WIDTH + 1));
    let height =
      MIN_ROOM_HEIGHT +
      Math.floor(Math.random() * (MAX_ROOM_HEIGHT - MIN_ROOM_HEIGHT + 1));
    let left = 1 + Math.floor(Math.random() * (MAP_WIDTH - width - 1));
    let top = 1 + Math.floor(Math.random() * (MAP_HEIGHT - height - 1));
    let newRoom = new Room(left, top, width, height);

    let failed = false;
    for (let g = 0; g < rooms.length; g++) {
      if (newRoom.intersectsWith(rooms[g])) {
        failed = true;
        i -= 1;
        break;
      }
    }
    if (!failed) {
      createRoom(newRoom, grid);
      if (rooms.length != 0) {
        let newCenter = newRoom.center;
        let prevCenter = rooms[rooms.length - 1].center;
        if (Math.random() * 2 >= 1) {
          let hcor = new HCorridor({
            x1: prevCenter.x,
            x2: newCenter.x,
            y: prevCenter.y,
          });
          createRoom(hcor, grid);
          h_corridors.push(hcor);
          let vcor = new VCorridor({
            y1: prevCenter.y,
            y2: newCenter.y,
            x: newCenter.x,
          });
          createRoom(vcor, grid);
          v_corridors.push(vcor);
        } else {
          let hcor = new HCorridor({
            x1: prevCenter.x,
            x2: newCenter.x,
            y: newCenter.y,
          });
          createRoom(hcor, grid);
          h_corridors.push(hcor);
          let vcor = new VCorridor({
            y1: prevCenter.y,
            y2: newCenter.y,
            x: prevCenter.x,
          });
          createRoom(vcor, grid);
          v_corridors.push(vcor);
        }
      }

      rooms.push(newRoom);
    }
  }
  player = new Player(rooms[0].center);
  //playerPosition = rooms[0].center;
  grid.updatePlayerPosition(player.position);
  placeItems(grid);
  placeEnemies(grid);
}

function placeEnemies(grid) {
  enemies = new Enemies(grid);
  let numberOfEnemies = Math.floor(
    Math.random() * (MAX_ENEMIES - MIN_ENEMIES) + MIN_ENEMIES
  );
  for (let i = 0; i < numberOfEnemies; i++) {
    let room = (i % (rooms.length - 1)) + 1;
    let position = rooms[room].getRandomPositionInside();
    while (items.PositionCollidesWithItem(position)) {
      position = rooms[room].getRandomPositionInside();
    }
    let enemy = new Enemy({ position: position });
    enemies.AddEnemy(enemy);
    grid.placeEnemy(enemy.position);
    console.log(enemy);
  }
}

function placeItems(grid) {
  // produces a random amount of items based on parameters, with a random assignment of healthpack or weapons. Ratio of weapons to healthpacks can be changed through constants
  items = new Items();
  let numberOfItems = Math.floor(
    Math.random() * (MAX_ITEMS - MIN_ITEMS) + MIN_ITEMS
  );
  let weaponRatio =
    Math.random() * (MAX_RATIO_WEAPONS - MIN_RATIO_WEAPONS) + MIN_RATIO_WEAPONS;
  let item = undefined;
  for (let i = 0; i < numberOfItems; i++) {
    let room = (i + 1) % rooms.length;
    let position = rooms[room].getRandomPositionInside();
    while (
      (room == 0 && position.collidesWithPoint(player.position)) ||
      items.PositionCollidesWithItem(position)
    ) {
      position = rooms[room].getRandomPositionInside();
    }
    if (Math.random() * 100 < weaponRatio) {
      //item is a weapon
      let weapon = getRandomWeapon(level);
      item = new Item(ITEM_WEAPON, position, weapon);
    } else {
      //item is not a weapon
      item = new Item(ITEM_HEALTHPACK, position);
    }
    items.AddItem(item);
    grid.placeItem(item.position);
  }
}

function getTileClassName(int) {
  let className = "error";
  switch (int) {
    case TILE_TUNNEL:
      className = "tunnel";
      break;
    case TILE_WALL:
      className = "wall";
      break;
    case 2:
      className = "item";
      break;
    case 3:
      className = "player";
      break;
    case TILE_ENEMY:
      className = "enemy";
      break;
    default:
      className = "error";
  }
  return className;
}

function testRoomCreation() {
  let iterations = 100;
  let errors = [];
  for (let i = 0; i < iterations; i++) {
    placeRooms();
    for (let g = 0; g < rooms.length; g++) {
      if (rooms[g].topLeft.x < 1)
        errors.push(
          "Room " + g + " has invalid left value: " + rooms[g].topLeft.x
        );
      if (rooms[g].topLeft.y < 1)
        errors.push(
          "Room " + g + " has invalid top value: " + rooms[g].topLeft.y
        );
      if (rooms[g].bottomRight.x > MAP_WIDTH - 1)
        errors.push(
          "Room " + g + " has invalid right value: " + rooms[g].topLeft.x
        );
      if (rooms[g].bottomRight.y > MAP_HEIGHT - 1)
        errors.push(
          "Room " + g + " has invalid bottom value: " + rooms[g].topLeft.y
        );
      for (let j = g + 1; j < rooms.length; j++) {
        if (rooms[g].intersectsWith(rooms[j]))
          errors.push(
            "Room " + g + " intersects with room " + j + ".",
            rooms[g],
            rooms[j]
          );
      }
    }
  }
  console.log(errors);
}

function handleKeyDown(event) {
  const keyName = event.key;
  let overrideKey = true; // this keeps track of whether to prevent default key action or not
  switch (keyName) {
    case "ArrowLeft":
      player.Move("west", grid);
      break;
    case "ArrowRight":
      player.Move("east", grid);
      break;
    case "ArrowUp":
      player.Move("north", grid);
      break;
    case "ArrowDown":
      player.Move("south", grid);
      break;
    default:
      overrideKey = false;
  }
  if (overrideKey) {
    console.log("prevent default");
    event.preventDefault();
  }
}

let grid = new Grid(MAP_WIDTH, MAP_HEIGHT);
placeRooms(grid);

//react stuff here
class Application extends React.Component {
  constructor(props) {
    super(props);
    this.reset = this.reset.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  componentDidMount() {
    document.addEventListener("keydown", this.onKeyDown);
  }
  reset() {
    placeRooms(grid);
    this.forceUpdate();
  }
  onKeyDown(e) {
    handleKeyDown(e);
    if (player.wasLastMoveValid()) {
      this.forceUpdate();
    }
  }
  scrollToBottom() {
    this.messageBox.scrollTop = this.messageBox.scrollHeight;
  }
  componentDidUpdate() {
    if (newMessageAvailable) {
      this.scrollToBottom();
      newMessageAvailable = false;
    } else {
    }
  }
  render() {
    return (
      <div>
        <button onClick={this.reset}>Reset</button>
        <table
          className='grid'
          id='display'
          onClick={this.onClick}
          ref={(gridTable) => {
            this.gridTable = gridTable;
          }}
        >
          <tbody>
            {this.props.Grid.createMap().map((obj, row) => (
              <tr key={row}>
                {obj.map((obj2, col) => (
                  <td className={getTileClassName(obj2)} key={col}></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div class='bottom_panel'>
          <div class='stat_panel'>
            <div class='stat_label'>Level: {this.props.Player.level}</div>
            <div class='stat_label'>
              Health: {this.props.Player.health}/
              {this.props.Player.getMaxHealth()}
            </div>
            <div class='stat_label'>
              Weapon: {this.props.Player.weapon.name}
            </div>
            <div class='stat_label'>Experience: {this.props.Player.xp}</div>
          </div>
          <div
            id='text_output'
            ref={(element) => {
              this.messageBox = element;
            }}
          >
            {this.props.Messages.map((obj, row) => (
              <span key={row}>{obj}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <Application Grid={grid} Player={player} Messages={messages} />,
  document.getElementById("board")
);

console.log("lolol");
