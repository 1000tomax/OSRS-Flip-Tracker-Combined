// src/lib/classification.js
// Centralized item classification with fine and coarse categories

// Priority for picking a single primary fine category
const CATEGORY_PRIORITY = [
  // Very specific gear buckets first
  'Barrows Equipment',
  'Dragon Equipment',
  'Raids Equipment',
  'GWD Equipment',
  'Tombs of Amascut Items',
  'Nightmare Items',
  'Gauntlet Items',
  'Desert Treasure Items',
  'Equipment Sets',
  'Ornament Kits',
  // Core gameplay categories
  'Ammunition',
  'Weapons',
  'Armour',
  'Magic Equipment',
  'Ranged Equipment',
  'Jewellery',
  // Consumables
  'Potions',
  'Food',
  'Runes',
  'Combat Supplies',
  // Skilling
  'Seeds',
  'Herbs',
  'Herblore Supplies',
  'Ores & Bars',
  'Logs',
  'Gems',
  'Crafting Materials',
  'Construction Materials',
  'Farming Supplies',
  'Smithing Supplies',
  'Woodcutting',
  'Hunter Supplies',
  // Utility
  'Tools',
  'Teleports',
  'Bones & Prayer',
  'Treasure Trails',
  'Books',
  'Utility',
  'Currency',
  // Fallback
  'Other',
];

// Map fine categories to a smaller set of coarse categories
const COARSE_MAP = {
  // Core
  Ammunition: 'Ammunition',
  Weapons: 'Weapons',
  Armour: 'Armour',
  'Magic Equipment': 'Magic',
  'Ranged Equipment': 'Weapons', // roll up into Weapons for coarser view
  Jewellery: 'Armour', // roll into gear bucket

  // Consumables
  Potions: 'Consumables',
  Food: 'Consumables',
  Runes: 'Magic',
  'Combat Supplies': 'Consumables',

  // Skilling
  Seeds: 'Skilling',
  Herbs: 'Skilling',
  'Herblore Supplies': 'Skilling',
  'Ores & Bars': 'Skilling',
  Logs: 'Skilling',
  Gems: 'Skilling',
  'Crafting Materials': 'Skilling',
  'Construction Materials': 'Skilling',
  'Farming Supplies': 'Skilling',
  'Smithing Supplies': 'Skilling',
  Woodcutting: 'Skilling',
  'Hunter Supplies': 'Skilling',

  // Boss/raid/uniques rolled together
  'Barrows Equipment': 'Special Gear',
  'Dragon Equipment': 'Special Gear',
  'Raids Equipment': 'Special Gear',
  'GWD Equipment': 'Special Gear',
  'Tombs of Amascut Items': 'Special Gear',
  'Nightmare Items': 'Special Gear',
  'Gauntlet Items': 'Special Gear',
  'Desert Treasure Items': 'Special Gear',
  'Equipment Sets': 'Special Gear',
  'Ornament Kits': 'Special Gear',

  // Utility / Misc
  Tools: 'Utility',
  Teleports: 'Utility',
  'Bones & Prayer': 'Prayer',
  'Treasure Trails': 'Utility',
  Books: 'Utility',
  Utility: 'Utility',
  Currency: 'Currency',
  Other: 'Other',
};

const COARSE_PRIORITY = [
  'Ammunition',
  'Weapons',
  'Armour',
  'Magic',
  'Consumables',
  'Skilling',
  'Special Gear',
  'Prayer',
  'Utility',
  'Currency',
  'Other',
];

export function choosePrimaryCategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return 'Other';
  const order = new Map(CATEGORY_PRIORITY.map((t, i) => [t, i]));
  return tags.slice().sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9))[0];
}

export function getCoarseCategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return 'Other';
  const coarseSet = new Set(tags.map(t => COARSE_MAP[t] || 'Other'));
  const order = new Map(COARSE_PRIORITY.map((t, i) => [t, i]));
  return Array.from(coarseSet).sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9))[0];
}

// Multi-tag item classification system (extracted from useSQLDatabase.js with enhancements)
export const classifyItem = itemName => {
  const item = (itemName || '').toLowerCase().trim();
  const tags = [];

  // Quick exits
  if (!item) return ['Other'];

  // Currency & Special Items
  if (item === 'coins' || item.includes('coin')) tags.push('Currency');
  if (item.includes('clue') || item.includes('casket')) tags.push('Treasure Trails');

  // Consumables
  if (/(potion|brew|mix|elixir)|\(\d\)$/.test(item)) tags.push('Potions', 'Consumables');
  if (
    /\b(shark|lobster|swordfish|tuna|salmon|trout|monkfish|karambwan|anglerfish|manta ray|bread|cake|pie|stew|pizza|food)\b/.test(
      item
    )
  ) {
    tags.push('Food', 'Consumables');
  }

  // Ammunition detection (with component exclusions)
  const isAmmoComponent =
    /(tip|tips|shaft|head|heads)\b/.test(item) ||
    item.includes('unfinished') ||
    item.includes('(u)');
  const mentionsAmmoCore = /\b(bolt|bolts|arrow|arrows|dart|darts|javelin|javelins)\b/.test(item);
  const isThrownKnife =
    item.includes('knife') &&
    (item.includes('throw') ||
      /\b(bronze|iron|steel|black|mithril|adamant|rune|dragon)\b/.test(item)) &&
    item !== 'knife';
  const isThrownAxe =
    item.includes('throwing axe') || item.includes('thrownaxe') || item.includes('thrown axe');

  if ((mentionsAmmoCore || isThrownKnife || isThrownAxe) && !isAmmoComponent) {
    tags.push('Ammunition', 'Ranged Equipment', 'Consumables');
  }

  if (item.endsWith(' rune') || item.endsWith(' runes'))
    tags.push('Runes', 'Magic Equipment', 'Consumables');

  // Bones & Prayer
  if (item.includes('bone') || item.includes('ashes')) tags.push('Bones & Prayer');

  // Combat Supplies & Special Items
  if (item.includes('scale') || item === "zulrah's scales")
    tags.push('Combat Supplies', 'Consumables');
  if (item.includes('chinchompa') || item === 'chinchompa')
    tags.push('Ranged Equipment', 'Hunter Supplies', 'Consumables');
  if (item.includes('cannon') || item.includes('cannonball'))
    tags.push('Ranged Equipment', 'Consumables');

  // Tools & Utility
  if (
    item.includes('pickaxe') ||
    item.includes('hatchet') ||
    item.includes('fishing rod') ||
    item.includes('harpoon') ||
    item.includes('net') ||
    item.includes('hammer')
  ) {
    tags.push('Tools');
  }
  if (item.includes('teleport') || item.includes('tablet') || item.includes('waystone')) {
    tags.push('Teleports', 'Utility');
  }
  if (item.includes('impling jar')) tags.push('Hunter Supplies');

  // Equipment - Add multiple tags for special equipment
  if (/^(ahrim|dharok|guthan|karil|torag|verac)/.test(item)) {
    tags.push('Barrows Equipment');
    if (/\b(platebody|body|robetop)\b/.test(item)) tags.push('Armour');
    if (/\b(platelegs|legs|robebottom)\b/.test(item)) tags.push('Armour');
    if (/\b(helm|hood)\b/.test(item)) tags.push('Armour');
    if (/\b(staff|spear|flail|hammers|crossbow)\b/.test(item)) tags.push('Weapons');
  }

  if (
    item.includes('dragon') &&
    !item.includes('hide') &&
    !item.includes('leather') &&
    !item.includes('bone')
  ) {
    tags.push('Dragon Equipment');
    if (/\b(platebody|platelegs|chainbody|helm|boots|shield)\b/.test(item)) tags.push('Armour');
    if (/\b(sword|scimitar|dagger|mace|spear|battleaxe|claws)\b/.test(item)) tags.push('Weapons');
    if (/\b(crossbow|bolt)\b/.test(item)) tags.push('Ranged Equipment');
  }

  // Twisted / Ancestral etc.
  if (item.includes('twisted')) {
    tags.push('Raids Equipment');
    if (item.includes('buckler')) tags.push('Armour', 'Equipment');
    if (item.includes('bow')) tags.push('Ranged Equipment', 'Weapons');
  }
  if (item.includes('ancestral')) {
    tags.push('Magic Equipment', 'Armour', 'Raids Equipment');
  }
  if (item.includes('blood moon')) {
    tags.push('Equipment', 'Armour');
    if (item.includes('chestplate')) tags.push('Armour');
    if (item.includes('tassets') || item.includes('legs')) tags.push('Armour');
    if (item.includes('helm')) tags.push('Armour');
  }

  // General Combat Gear (if not already tagged)
  if (
    !tags.includes('Weapons') &&
    /\b(sword|scimitar|dagger|mace|whip|spear|halberd|battleaxe|godsword|rapier|bludgeon|claws)\b/.test(
      item
    )
  ) {
    tags.push('Weapons');
  }
  if (
    !tags.includes('Ranged Equipment') &&
    /\b(bow|crossbow|blowpipe|cannon)\b/.test(item) &&
    !item.includes('string')
  ) {
    tags.push('Ranged Equipment');
  }
  if (!tags.includes('Magic Equipment') && /\b(staff|wand|sceptre|trident)\b/.test(item)) {
    tags.push('Magic Equipment');
  }
  if (
    !tags.includes('Armour') &&
    /\b(platebody|platelegs|plateskirt|chainbody|body|legs|helm|helmet|shield|boots|gloves|cape|defender)\b/.test(
      item
    )
  ) {
    tags.push('Armour');
  }
  if (/\b(ring|necklace|amulet|bracelet)\b/.test(item)) {
    tags.push('Jewellery', 'Equipment');
  }

  // Skilling Resources
  if (item.includes('seed')) tags.push('Seeds', 'Farming Supplies');
  if (item.includes('sapling')) tags.push('Farming Supplies');
  if (/(grimy|clean) \w+/.test(item) && !item.includes('potion'))
    tags.push('Herbs', 'Herblore Supplies');

  const herbNames = [
    'guam',
    'marrentill',
    'tarromin',
    'harralander',
    'ranarr',
    'toadflax',
    'irit',
    'avantoe',
    'kwuarm',
    'snapdragon',
    'cadantine',
    'lantadyme',
    'dwarf weed',
    'torstol',
  ];
  if (
    herbNames.some(herb => item.includes(herb)) &&
    !item.includes('potion') &&
    !item.includes('seed')
  ) {
    tags.push('Herbs', 'Herblore Supplies');
  }
  if (item.includes(' ore') || item === 'coal')
    tags.push('Ores & Bars', 'Mining', 'Smithing Supplies');
  if (item.includes(' bar')) tags.push('Ores & Bars', 'Smithing Supplies');
  if (item.includes('logs') || item.endsWith(' log'))
    tags.push('Logs', 'Woodcutting', 'Firemaking');

  // Leather & hides
  if (item.includes('hide') || item.includes('leather') || item.includes('dragonhide')) {
    tags.push('Crafting Materials');
  }

  // Gems (exclude bolts)
  if (
    !item.includes('bolt') &&
    /\b(uncut |cut )?(diamond|ruby|emerald|sapphire|opal|jade|topaz|dragonstone|onyx|zenyte)\b/.test(
      item
    )
  ) {
    tags.push('Gems', 'Crafting Materials');
  }

  // Fletching components
  if (/(arrowtip|arrowtips|dart tip|bolt tip|tips|shaft|javelin heads|javelin head)/.test(item)) {
    tags.push('Crafting Materials');
  }

  // Brutal arrows
  if (item.includes('brutal')) {
    tags.push('Ammunition', 'Ranged Equipment', 'Consumables');
  }

  // D'hide and ranged armour pieces
  if (/\b(chaps|coif|vambraces|bandana)\b/.test(item)) {
    tags.push('Armour', 'Ranged Equipment');
  }

  // Orbs (crafting/magic)
  if (item.endsWith(' orb') || item.includes(' orb')) {
    tags.push('Crafting Materials');
    if (!tags.includes('Magic Equipment')) tags.push('Magic Equipment');
  }

  // Bird house (Hunter)
  if (item.includes('bird house')) tags.push('Hunter Supplies');

  // Herblore ingredients
  if (item.includes('amylase')) tags.push('Herblore Supplies');
  if (
    item.includes('snape grass') ||
    item.includes("red spiders' eggs") ||
    item.includes('cactus spine')
  ) {
    tags.push('Herblore Supplies');
  }

  // Pages and blessings
  if (item.includes(' page')) tags.push('Books');
  if (item.includes('blessing')) tags.push('Prayer');

  // Battlestaves and wards
  if (item.includes('battlestaff')) tags.push('Magic Equipment');
  if (item.includes('ward')) tags.push('Armour');
  if (item.includes("dagon'hai")) tags.push('Magic Equipment', 'Armour');
  if (item.includes("dinh's bulwark")) tags.push('Armour');
  if (item.includes('dual macuahuitl')) tags.push('Weapons', 'Special Items');
  if (item.includes('dynamite')) tags.push('Skilling');
  if (item.includes('elder chaos')) tags.push('Magic Equipment', 'Armour');
  if (item.includes('elder maul') || item.includes('granite maul')) tags.push('Weapons');
  if (item.includes('heavy ballista')) tags.push('Ranged Equipment', 'Weapons');
  if (item.includes('justiciar')) tags.push('Armour', 'Raids Equipment');

  // Common food additions
  if (
    item.includes('grapes') ||
    item.includes('bass') ||
    item.includes('dark crab') ||
    item.includes('sea turtle')
  ) {
    tags.push('Food', 'Consumables');
  }
  if (item.includes('beer') || item.includes('wine') || item.includes('ale'))
    tags.push('Consumables');

  // Strings and materials
  if (item.includes('bow string')) tags.push('Crafting Materials');

  // DT2 awakened items
  if (item.includes('awakener')) tags.push('Special Items', 'Desert Treasure Items');

  // Moon equipment
  if (
    item.includes('moon') &&
    (item.includes('chestplate') || item.includes('tassets') || item.includes('helm'))
  ) {
    tags.push('Armour', 'Equipment');
  }

  // Specific uniques
  if (item.includes('blood essence')) tags.push('Skilling');
  if (item.includes('bloodbark')) tags.push('Magic Equipment', 'Armour');
  if (item.includes('blighted') && item.includes('sack')) tags.push('PvP Items', 'Utility');
  if (item.includes('antler guard')) tags.push('Armour', 'Equipment');
  if (item.includes('bandos cloak')) tags.push('Armour');
  if (/(^| )axe$/.test(item)) tags.push('Tools');
  if (item.includes('sabre')) tags.push('Weapons');
  if (item.includes("chef's delight")) tags.push('Consumables');
  if (item.includes('coconut')) tags.push('Food', 'Farming Supplies');
  if (item.includes('cadava berries')) tags.push('Food');
  if (item.includes('clockwork')) tags.push('Construction Materials');
  if (item.includes('bag of salt') || item.includes('basalt')) tags.push('Skilling');
  if (item.includes('firelighter')) tags.push('Utility');
  if (item.includes('talisman')) tags.push('Magic');
  if (item.includes('bagged plant')) tags.push('Construction Materials');
  if (item.includes('aether catalyst')) tags.push('Utility');
  if (item.includes('aldarium') || item.includes('ingot')) tags.push('Smithing Supplies');
  if (item.includes('calcified moth') || item.includes('calcite')) tags.push('Skilling');
  if (item.includes('antelope')) tags.push('Food');
  if (item.includes('hot water')) tags.push('Consumables');
  if (
    item.includes('demon tear') ||
    item.includes('demonic tallow') ||
    item.includes('diabolic worms')
  )
    tags.push('Special Items');
  if (item.includes('bottomless compost bucket')) tags.push('Farming Supplies');
  if (item.includes('flared trousers')) tags.push('Armour');
  if (item.includes('holy sandals')) tags.push('Armour', 'Prayer');
  if (item.includes('eye of ayak')) tags.push('Special Items');
  if (item.includes('feather')) tags.push('Skilling');
  if (item.includes('iron spit')) tags.push('Tools');
  if (item.includes('kraken tentacle')) tags.push('Special Items');
  if (item === 'lightbearer') tags.push('Jewellery', 'Equipment', 'Special Items');
  if (item.includes('limestone brick')) tags.push('Construction Materials');
  if (item === 'longbow' || item.includes('longbow') || item.includes('shortbow'))
    tags.push('Ranged Equipment', 'Weapons');
  if (item.includes("mage's book")) tags.push('Magic Equipment');
  if (item.includes('magic fang')) tags.push('Magic Equipment', 'Special Items');
  if (item.includes('shortbow scroll')) tags.push('Special Items');
  if (item.includes('plank')) tags.push('Construction Materials');
  if (item.includes('hydra tail')) tags.push('Special Items');
  if (item.includes("efaritay's aid")) tags.push('Special Items');
  if (item.includes('atlatl')) tags.push('Ranged Equipment', 'Weapons');
  if (item.includes('gauntlets')) tags.push('Armour');
  if (item.includes('fat snail') || item.includes('dough')) tags.push('Food');
  if (item.includes('mole claw') || item.includes('mole skin')) tags.push('Special Items');
  if (item.includes('mort myre fungus')) tags.push('Herblore Supplies');
  if (item.includes('mystic')) tags.push('Magic Equipment', 'Armour');
  if (item.includes('numulite')) tags.push('Utility');
  if (item.includes('oathplate chest')) tags.push('Armour');
  if (item.includes('obsidian armour set')) tags.push('Armour');
  if (item.includes('ornate maul handle')) tags.push('Special Items');
  if (item.includes("osmumten's fang")) tags.push('Weapons', 'Tombs of Amascut Items');
  if (item.includes('papaya fruit')) tags.push('Food', 'Farming Supplies');
  if (item === 'pot' || item.includes('pot of')) tags.push('Consumables');
  if (item.includes('potato with')) tags.push('Food');
  if (item.includes('quetzal feed')) tags.push('Skilling');
  if (item.includes("rangers' tights")) tags.push('Armour');
  if (item.includes("rangers' tunic") || item.includes('robin hood hat'))
    tags.push('Armour', 'Ranged Equipment');
  if (item.includes('soft clay')) tags.push('Construction Materials');
  if (item.includes('supercompost')) tags.push('Farming Supplies');
  if (item.includes('tinderbox')) tags.push('Tools');
  if (item.includes('rune pouch note')) tags.push('Utility');
  if (item.includes('revenant ether')) tags.push('Special Items', 'Combat Supplies');
  if (item.includes('sarachnis cudgel') || item.includes('swift blade')) tags.push('Weapons');
  if (item.includes('spiked manacles')) tags.push('Armour');
  if (item.includes('smouldering stone')) tags.push('Special Items');
  if (item.includes('lockpick')) tags.push('Utility');
  if (item.includes('toktz-ket-xil')) tags.push('Armour');
  if (item.includes('toktz-xil-ak')) tags.push('Weapons');
  if (item.includes('tome of fire') || item.includes('tome of water'))
    tags.push('Magic Equipment', 'Books');
  if (item.includes('raw kyatt')) tags.push('Food');

  // Examples from existing rules
  if (item === 'molten glass') tags.push('Crafting Materials', 'Smithing Supplies');
  if (item === 'unpowered orb') tags.push('Crafting Materials');

  // High-value items (subset)
  if (item.includes('eldritch') || item.includes('harmonised') || item.includes('volatile')) {
    tags.push('Magic Equipment', 'Special Items', 'Raids Equipment');
  }
  if (item.includes('basilisk jaw')) tags.push('Special Items', 'Combat Supplies', 'Slayer Items');
  if (item.includes('elidinis') && item.includes('ward'))
    tags.push('Magic Equipment', 'Armour', 'Desert Treasure Items');
  if (item.includes('virtus')) tags.push('Magic Equipment', 'Armour', 'Desert Treasure Items');
  if (item.includes('inquisitor')) tags.push('Armour', 'Special Items', 'Nightmare Items');
  if (item.includes('ankou')) tags.push('Equipment', 'Special Items');
  if (item.includes('sunfire') || item.includes('fanatic'))
    tags.push('Equipment', 'Armour', 'Tombs of Amascut Items');
  if (item.includes('ornament kit')) tags.push('Ornament Kits', 'Special Items');
  if (item.includes('arcane sigil')) tags.push('Magic Equipment', 'Special Items', 'GWD Equipment');
  if (item.includes('tormented synapse')) tags.push('Special Items', 'Combat Supplies');
  if (item.includes('saturated heart'))
    tags.push('Special Items', 'Combat Supplies', 'Slayer Items');
  if (
    item.includes('armadyl') &&
    (item.includes('chestplate') || item.includes('chainskirt') || item.includes('helmet'))
  ) {
    tags.push('Armour', 'GWD Equipment', 'Ranged Equipment');
  }
  if (item.includes('masori')) tags.push('Armour', 'Ranged Equipment', 'Tombs of Amascut Items');
  if (item.includes('tonalztics'))
    tags.push('Magic Equipment', 'Special Items', 'Tombs of Amascut Items');
  if (
    item.includes('bandos') &&
    (item.includes('chestplate') || item.includes('tassets') || item.includes('boots'))
  ) {
    tags.push('Armour', 'GWD Equipment');
  }
  if (item.includes('voidwaker')) tags.push('Weapons', 'Special Items');
  if (item.includes('dexterous prayer scroll')) tags.push('Special Items', 'Prayer');
  if (item.includes('blood shard')) tags.push('Special Items', 'Crafting Materials');
  if (item.includes('blade of saeldor')) tags.push('Weapons', 'Special Items', 'Gauntlet Items');

  // Unfinished items
  if (item.includes('(u)') || item.includes('unfinished')) {
    tags.push('Unfinished Items', 'Crafting Materials');
    if (item.includes('bow')) tags.push('Ranged Equipment');
  }

  // Sets
  if (
    item.includes(' set') &&
    (item.includes('ancestral') ||
      item.includes('justiciar') ||
      item.includes('bandos') ||
      item.includes('armadyl'))
  ) {
    tags.push('Equipment Sets', 'Armour');
    if (item.includes('ancestral')) tags.push('Magic Equipment', 'Raids Equipment');
    if (item.includes('justiciar')) tags.push('Raids Equipment');
    if (item.includes('bandos') || item.includes('armadyl')) tags.push('GWD Equipment');
  }

  if (tags.length === 0) tags.push('Other');
  return [...new Set(tags)];
};

export default classifyItem;
