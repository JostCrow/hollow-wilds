import creatureData from "../../../data/creatures.json" with { type: "json" };
export const PLAYER_HEIGHT_METRES = 1.7;
export type Family =
  | "frog"
  | "otter"
  | "dinosaur"
  | "canine"
  | "slug"
  | "cat"
  | "plant"
  | "beetle"
  | "bird"
  | "ghost"
  | "rodent"
  | "blob"
  | "golem"
  | "fly"
  | "mushroom"
  | "moth"
  | "robot"
  | "bear"
  | "crystal"
  | "cherub"
  | "serpent"
  | "armadillo"
  | "rabbit"
  | "mote"
  | "turtle"
  | "fish"
  | "caterpillar"
  | "cocoon"
  | "flower"
  | "dragon";
export type ModelProfile = {
  family: Family;
  body: string;
  accent: string;
  eye: string;
  stage: number;
  features: string[];
  reference: "illustration" | "description";
};
export const speciesData = Object.fromEntries(
  creatureData.map((c) => [c.name, c]),
);
const p = (
  family: Family,
  body: string,
  accent: string,
  stage = 1,
  features = "",
  eye = "#363a2b",
  reference: ModelProfile["reference"] = "illustration",
): ModelProfile => ({
  family,
  body,
  accent,
  stage,
  features: features.split(" ").filter(Boolean),
  eye,
  reference,
});
// Individual silhouettes, palettes, and anatomical details authored from the original illustrations.
// The 17 designs without artwork follow their original appearance descriptions instead.
export const modelProfiles: Record<string, ModelProfile> = {
  Flarepib: p("frog", "#fa8a22", "#ffdd65"),
  Lumacroak: p("frog", "#de842c", "#7cdae0", 2, "throat vents"),
  Solamphibos: p("frog", "#f8e4a2", "#efb63e", 3, "sun throat"),
  Verdreep: p("otter", "#788632", "#a5b552", 1, "leaves wisps"),
  Phantotter: p("otter", "#82bb92", "#b6e4bd", 2, "ghost reeds"),
  Abyreedon: p(
    "otter",
    "#355133",
    "#a7c68b",
    3,
    "leaves wisps horns",
    "#68cda6",
  ),
  Rivanos: p("dinosaur", "#39b2d3", "#397284", 1, "snout"),
  Terrinoir: p("dinosaur", "#52666b", "#859390", 2, "plates horns"),
  Duskuragon: p("dinosaur", "#153b52", "#79cbe0", 3, "skull horns spines"),
  Pupawn: p("canine", "#d1ab79", "#f4d9a8", 0, "floppy"),
  Ignisrael: p("canine", "#302b28", "#e96120", 3, "flames horns", "#eeb037"),
  Torrentis: p("canine", "#207baf", "#7bcef0", 2, "fins", "#b3e8ef"),
  Verdama: p("canine", "#244c2a", "#6e9c35", 2, "leaves flowers", "#dbb645"),
  Runaris: p("canine", "#8f9697", "#e8bd75", 2, "runes"),
  Noctyros: p("canine", "#292731", "#4c4655", 2, "spines", "#a27ce5"),
  Solarune: p("canine", "#e9b93f", "#fff0b1", 2, "halo mane", "#fce296"),
  Gravulor: p("canine", "#5c4935", "#978366", 3, "armor crystals"),
  Wraithound: p("canine", "#7d99a6", "#b4d2d8", 2, "ghost wisps", "#bce8e6"),
  Tempestral: p("canine", "#55839c", "#d2e8ec", 2, "wings feathers", "#78e3f0"),
  Cryovelis: p("canine", "#609fbc", "#c5eff2", 2, "crystals spines", "#9bfff0"),
  Voltalis: p("canine", "#e4bd33", "#343b3c", 2, "bolts mane", "#b4e9ed"),
  Venomaris: p("canine", "#292635", "#74c63a", 2, "veins spines", "#a1f64f"),
  Ferronyx: p("canine", "#596262", "#99a5a0", 3, "armor gears"),
  Eclipsera: p("canine", "#2a282f", "#edb740", 2, "split halo mane", "#fae391"),
  Pipereef: p("slug", "#438eb6", "#77b9d6", 1, "siphons fins"),
  Reedmollusk: p("slug", "#a1c8df", "#e0eff2", 2, "siphons wings crystals"),
  Nibbkit: p("cat", "#6c6865", "#424440", 1, "stitches tuft", "#b5a6cf"),
  Purlarcen: p("cat", "#c7c3b8", "#575956", 2, "mask ribbon", "#e4bc64"),
  Twigglo: p("plant", "#a0ad3f", "#d0df67", 1, "bud cape", "#687440"),
  Brambright: p("plant", "#638949", "#b6d582", 2, "crown fans", "#a1dcba"),
  Solbriar: p("plant", "#3a6736", "#e7ba32", 3, "sun vines"),
  Mitelet: p("beetle", "#827455", "#a38d68", 1, "antennae segments", "#a483ca"),
  Caraphex: p(
    "beetle",
    "#675043",
    "#ae76c8",
    3,
    "crystals claws segments",
    "#c44737",
  ),
  Cindlark: p("bird", "#34343b", "#ea6539", 1, "ember"),
  Pyrocor: p("bird", "#726e65", "#ed8e3e", 2, "flames feathers", "#e8b35b"),
  Noxling: p("ghost", "#39363e", "#56515d", 1, "cloth tail", "#faf1ce"),
  Ferrimaw: p("canine", "#393b37", "#778077", 2, "armor jaw horns", "#d6b35d"),
  Niblet: p("rodent", "#d1ad79", "#f0dbac", 1, "teeth round", "#533b31"),
  Gnawer: p("rodent", "#59412f", "#9a7754", 2, "teeth scar claws", "#b85c3e"),
  Puddlop: p("blob", "#70c6e5", "#b4eff0", 1, "gel"),
  Sparkbug: p("beetle", "#e5c43c", "#343531", 1, "bolts antennae"),
  Voltbeetle: p("beetle", "#344c63", "#e5c33b", 2, "horn claws", "#e7bb48"),
  Peblit: p("golem", "#7c7a70", "#f29433", 1, "cracks"),
  Boulrock: p("golem", "#797b70", "#ed8b32", 2, "cracks plates"),
  Terramight: p(
    "golem",
    "#34363a",
    "#ff7629",
    3,
    "cracks crystals armor",
    "#f3a335",
  ),
  Frostling: p("ghost", "#c8e6ec", "#8eb8ce", 1, "ice sad", "#6a9db7"),
  Venomite: p("fly", "#74853e", "#a479c4", 1, "spots compound"),
  Plaguewing: p("fly", "#686a32", "#9165ad", 2, "spots compound tattered"),
  Shroombud: p("mushroom", "#e2c99c", "#a44943", 1, "spots"),
  Fungrowth: p("mushroom", "#bfa374", "#a971af", 2, "spots fungi"),
  Sporecrown: p("mushroom", "#c68946", "#eeb432", 3, "crown fungi spots"),
  Whispling: p("ghost", "#b7c8c8", "#dee5dd", 2, "cloud", "#9674ac"),
  Phantgale: p("ghost", "#8bb6ce", "#c7e3ed", 3, "vortex arms", "#9e8dca"),
  Tindertail: p("rodent", "#aa5c33", "#ef9b3d", 1, "flametail ears"),
  Shadowpup: p("canine", "#272630", "#45404d", 1, "wisps", "#f34c53"),
  Duskhound: p("canine", "#25252c", "#4c4655", 2, "spines wisps", "#ed464a"),
  Nighterror: p(
    "canine",
    "#25242e",
    "#51495d",
    3,
    "threeheads chains wisps",
    "#df5156",
  ),
  Glimmoth: p("moth", "#eccb54", "#dc83aa", 1, "prism", "#dba632"),
  Radianthra: p("moth", "#efd66c", "#70bcb0", 2, "prism sun", "#f5e4a5"),
  Coglin: p("robot", "#68715c", "#a18f4a", 1, "gears ears", "#f5dd83"),
  Mechagrin: p(
    "robot",
    "#61675d",
    "#e99b3f",
    3,
    "furnace stacks grin",
    "#e0d49b",
  ),
  Embercub: p("bear", "#e36b26", "#f7b746", 1, "flames ears"),
  Flamebear: p("bear", "#9c3025", "#ef8631", 2, "flames claws"),
  Infernursus: p("bear", "#38312f", "#f28224", 3, "cracks flames armor"),
  Glacimite: p("crystal", "#6ba7c4", "#c7eff7", 2, "crystals armor", "#bfe6ed"),
  Lumikid: p("cherub", "#f5d963", "#fff3b2", 1, "halo wings"),
  Volteel: p("serpent", "#244c62", "#eacb3f", 2, "bolts fins", "#5fdde1"),
  Ironhide: p("armadillo", "#494c55", "#6d747a", 2, "armor claws"),
  Snochi: p("rabbit", "#e8ece3", "#7eb3cc", 1, "soft"),
  Snoven: p("rabbit", "#d0e5e4", "#7eafbd", 2, "ruff"),
  Glacimal: p("rabbit", "#d8edf0", "#93cadd", 3, "ghost wisps", "#63d6eb"),
  Harefrost: p("rabbit", "#8b969c", "#d5e0e0", 3, "armor blades"),
  Sparkle: p(
    "mote",
    "#f7d94f",
    "#fff7aa",
    1,
    "bolts",
    "#4c5d51",
    "description",
  ),
  Voltwing: p(
    "bird",
    "#eccc38",
    "#c3e8e6",
    2,
    "bolts cloud",
    "#f2e9b6",
    "description",
  ),
  Stormlord: p(
    "bird",
    "#55546b",
    "#f2d55e",
    3,
    "fourwings bolts cloud",
    "#ffe877",
    "description",
  ),
  Currenshell: p(
    "turtle",
    "#66766a",
    "#b77a43",
    2,
    "coils bulb",
    "#e8de87",
    "description",
  ),
  "Ohm-Titan": p(
    "robot",
    "#667982",
    "#d7b546",
    4,
    "coils armor",
    "#b1eff0",
    "description",
  ),
  Glub: p("fish", "#549dc5", "#bedce6", 1, "mouth", "#eeeccf", "description"),
  "Glub-Glub": p(
    "fish",
    "#347da4",
    "#80b5c9",
    2,
    "mouth jaw",
    "#e7e6c6",
    "description",
  ),
  "Glub-Abyss": p(
    "fish",
    "#242f40",
    "#99564e",
    3,
    "lure teeth",
    "#ef6463",
    "description",
  ),
  "Glub-Arctic": p(
    "fish",
    "#91d0df",
    "#d2f1f0",
    3,
    "crystals fins",
    "#66a4cd",
    "description",
  ),
  Icipillar: p(
    "caterpillar",
    "#b0dfec",
    "#ad7ac7",
    1,
    "spikes",
    "#656d8d",
    "description",
  ),
  Frostsalis: p(
    "cocoon",
    "#a2d4e4",
    "#9d76b8",
    1,
    "ice segments",
    "#705d91",
    "description",
  ),
  "Moth-Frost": p(
    "moth",
    "#b2dce9",
    "#f0f8ec",
    2,
    "snowflake",
    "#7894b0",
    "description",
  ),
  "Venom-Glaze": p(
    "fly",
    "#9bc7da",
    "#9c66c6",
    2,
    "needles veins",
    "#c481d8",
    "description",
  ),
  Petal: p(
    "flower",
    "#8eae52",
    "#eaa1b2",
    1,
    "petal",
    "#4d674a",
    "description",
  ),
  "Bloom-Bud": p(
    "flower",
    "#5c9252",
    "#d996ae",
    2,
    "buds",
    "#476249",
    "description",
  ),
  "Sun-Bather": p(
    "flower",
    "#4c8b3f",
    "#f0c24e",
    3,
    "sun",
    "#6b5c31",
    "description",
  ),
  "Moon-Dancer": p(
    "flower",
    "#58415f",
    "#d7cfed",
    3,
    "lily",
    "#c4c5ed",
    "description",
  ),
  Solarius: p("bird", "#e9a12b", "#ffe38a", 4, "sun flames ribbons", "#fff5bf"),
  Lumidrake: p(
    "dragon",
    "#e2e7cc",
    "#eac66a",
    3,
    "wings antlers prism",
    "#62c4d2",
  ),
  Umbradrake: p(
    "dragon",
    "#303d4b",
    "#1b252d",
    3,
    "wings horns spines",
    "#e68b70",
  ),
  Eclipserion: p(
    "dragon",
    "#a7c4d4",
    "#263744",
    4,
    "halo fins ghost",
    "#94d8ef",
  ),
};
