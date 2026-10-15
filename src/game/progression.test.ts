import test from "node:test";
import assert from "node:assert/strict";
import { beginBattle, beginTrainerBattle, catchChance, makeCompanion, newSave, parseSave, takeTurn } from "./engine.ts";
import type { Save, Battle, Action } from "./engine.ts";
import { champions, gyms, trainers, lockReason } from "./progression.ts";
import { creatures, species } from "./data.ts";
import { createSpawns, getWorld, zones } from "./world.ts";

function strongSave() {
  const save = newSave("Flarepib", "League tester");
  save.party = [makeCompanion("Niblet", 100)];
  save.party[0].moves = ["quick_attack"];
  save.party[0].pp = { quick_attack: 30 };
  return save;
}
function knockout(save: Save, battle: Battle) {
  // Fixed move, speed, low enemy HP, and RNG isolate party transitions from damage balance.
  battle.enemy.hp = 1;
  return takeTurn(save, battle, { type: "move", key: "quick_attack" }, () => 0.1);
}

test("the 12 gyms grow progressively from pure types to mixed full parties", () => {
  assert.equal(gyms.length, 12);
  assert.equal(new Set(gyms.map((g) => g.zone)).size, 12);
  for (const [i, gym] of gyms.entries()) {
    assert.ok(gym.badge);
    assert.ok(gym.team.length >= 2 && gym.team.length <= 6);
    if (i) assert.ok(gym.team.at(-1)!.level > gyms[i - 1].team.at(-1)!.level);
    const hall = getWorld(gym.zone).buildings.find((b) => b.service === "gym");
    assert.ok(hall);
    if (i < 6) for (const member of gym.team) assert.deepEqual(species[member.species].typing, gym.types);
    else assert.ok(new Set(gym.team.flatMap((c) => species[c.species].typing)).size >= 3);
  }
  assert.equal(gyms.at(-1)!.team.length, 6);
});

test("trainers inhabit every camper NPC area with fixed parties from low levels to 60", () => {
  assert.equal(trainers.length, zones.flatMap((z) => z.npcs.filter((n) => n.role === "camper")).length);
  assert.equal(new Set(trainers.map((t) => t.id)).size, trainers.length);
  const levels = trainers.flatMap((t) => t.team.map((c) => c.level));
  assert.ok(Math.min(...levels) <= 5);
  assert.equal(Math.max(...levels), 60);
  for (const trainer of trainers) for (const member of trainer.team) {
    assert.ok(species[member.species]);
    assert.ok(!species[member.species].legendary && !species[member.species].mythical);
  }
});

test("badges enforce the circuit; all badges unlock successive mixed champions", () => {
  const save = strongSave();
  assert.equal(lockReason(gyms[0], save), null);
  assert.equal(beginTrainerBattle(save, gyms[1]), null);
  assert.equal(beginTrainerBattle(save, champions[0]), null);
  for (const gym of gyms) {
    assert.equal(lockReason(gym, save), null);
    save.badges.push(gym.id);
  }
  for (const [i, champion] of champions.entries()) {
    assert.equal(champion.team.length, 6);
    const typings = champion.team.map((c) => species[c.species].typing);
    assert.ok(new Set(typings.flat()).size >= 6);
    assert.ok(!typings[0].some((type) => typings.every((ts) => ts.includes(type))));
    assert.equal(lockReason(champion, save), null);
    if (i + 1 < champions.length) assert.equal(beginTrainerBattle(save, champions[i + 1]), null);
    save.defeatedChampions.push(champion.id);
  }
});

test("a gym must lose its whole party before awarding a badge, win, or prize", () => {
  let save = strongSave();
  let battle = beginTrainerBattle(save, gyms[0])!;
  const money = save.money, hp = save.party[0].hp;
  const first = knockout(save, battle);
  assert.equal(first.battle.outcome, null);
  assert.equal(first.battle.reserves.length, 0);
  assert.equal(first.battle.defeatedEnemies, 1);
  assert.equal(first.battle.enemy.species, gyms[0].team[1].species);
  assert.equal(first.save.money, money);
  assert.equal(first.save.party[0].hp, hp, "new opponent cannot attack on entry");
  assert.equal(first.save.wins, 0);
  assert.deepEqual(first.save.badges, []);
  assert.ok(first.save.party[0].xp > 0);
  ({ save, battle } = knockout(first.save, first.battle));
  assert.equal(battle.outcome, "won");
  assert.equal(save.wins, 1);
  assert.equal(save.money, money + gyms[0].reward);
  assert.deepEqual(save.badges, [gyms[0].id]);
  assert.equal(save.badge, false, "gym badges are separate from Elowen's ranger badge");
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))), save);
  const replay = takeTurn(save, battle, { type: "move", key: "quick_attack" });
  assert.equal(replay.save.money, save.money);
  let rematch = beginTrainerBattle(save, gyms[0])!;
  for (let i = 0; i < gyms[0].team.length; i++) ({ save, battle: rematch } = knockout(save, rematch));
  assert.equal(save.money, money + gyms[0].reward * 1.5);
  assert.deepEqual(save.badges, [gyms[0].id]);
});

test("trainer captures, conceding, and losses never award prizes or progress", () => {
  for (const opponent of [trainers[0], gyms[0], champions[0]]) {
    const save = strongSave();
    if (opponent.kind === "champion") save.badges = gyms.map((g) => g.id);
    const battle = beginTrainerBattle(save, opponent)!;
    const capture = takeTurn(save, battle, { type: "catch" }, () => 0);
    assert.equal(capture.save, save);
    assert.equal(capture.battle, battle);
    const conceded = takeTurn(save, battle, { type: "run" });
    assert.equal(conceded.battle.outcome, "fled");
    assert.deepEqual(conceded.save, save);
    const weak = newSave("Flarepib", "Test");
    weak.party[0].hp = 1;
    weak.badges = [...save.badges];
    const loss = takeTurn(weak, beginTrainerBattle(weak, opponent)!, { type: "move", key: "growl" }, () => 0.1);
    assert.equal(loss.battle.outcome, "lost");
    assert.deepEqual(loss.save.badges, weak.badges);
    assert.deepEqual(loss.save.defeatedTrainers, []);
    assert.deepEqual(loss.save.defeatedChampions, []);
  }
});

test("trainer and champion victories persist their own completion records", () => {
  for (const opponent of [trainers.at(-1)!, champions[2]]) {
    let save = strongSave();
    save.badges = gyms.map((g) => g.id);
    save.defeatedChampions = champions.slice(0, 2).map((c) => c.id);
    let battle = beginTrainerBattle(save, opponent)!;
    const money = save.money;
    for (let i = 0; i < opponent.team.length; i++) ({ save, battle } = knockout(save, battle));
    assert.equal(battle.outcome, "won");
    assert.equal(save.money, money + opponent.reward);
    assert.ok((opponent.kind === "trainer" ? save.defeatedTrainers : save.defeatedChampions).includes(opponent.id));
    assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))), save);
  }
});

test("legacy saves migrate league records without altering ranger progress or captured guardians", () => {
  const old = JSON.parse(JSON.stringify(newSave("Flarepib", "Test")));
  delete old.badges; delete old.defeatedTrainers; delete old.defeatedChampions;
  old.badge = true;
  old.caught.push("Solarius");
  const save = parseSave(old);
  assert.deepEqual(save.badges, []);
  assert.deepEqual(save.defeatedTrainers, []);
  assert.deepEqual(save.defeatedChampions, []);
  assert.equal(save.badge, true);
  assert.ok(save.caught.includes("Solarius"));
  assert.throws(() => parseSave({ ...old, badges: ["fake-badge"] }));
  assert.throws(() => parseSave({ ...old, defeatedChampions: [gyms[0].id] }));
});

for (const guardian of creatures.filter((c) => c.legendary || c.mythical)) {
  test(`${guardian.name} is level 80, hard to catch, and permanently absent only after capture`, () => {
    const zone = zones.find((z) => z.sanctuary?.species === guardian.name)!;
    const save = strongSave();
    const battle = beginBattle(save, guardian.name, 80);
    assert.equal(catchChance(battle.enemy), 0.02);
    battle.enemy.hp = 1;
    assert.ok(catchChance(battle.enemy) < 0.18);
    for (const action of [{ type: "run" }, { type: "move", key: "quick_attack" }] as Action[]) {
      const retry = takeTurn(save, battle, action, () => 0.1);
      assert.ok(createSpawns(zone.id, 3, Math.random, retry.save.caught).some((s) => s.species === guardian.name));
    }
    const capture = takeTurn(save, battle, { type: "catch" }, () => 0);
    assert.equal(capture.battle.outcome, "caught");
    const restored = parseSave(JSON.parse(JSON.stringify(capture.save)));
    for (let cycle = 0; cycle < 12; cycle++) {
      const available = createSpawns(zone.id, cycle, Math.random, save.caught);
      assert.equal(available.filter((s) => s.species === guardian.name).length, 1);
      assert.equal(available.find((s) => s.species === guardian.name)!.level, 80);
      assert.ok(!createSpawns(zone.id, cycle, Math.random, restored.caught).some((s) => s.species === guardian.name));
    }
    const duplicate = takeTurn(restored, battle, { type: "catch" }, () => 0);
    assert.equal(duplicate.save, restored);
    assert.equal(duplicate.save.balls, restored.balls);
  });
}

test("unlock checks use stable IDs for copied opponent definitions", () => {
  const save = strongSave();
  assert.equal(lockReason(structuredClone(gyms[0]), save), null);
  assert.ok(lockReason(structuredClone(gyms[1]), save));
  save.badges = gyms.map((g) => g.id);
  assert.equal(lockReason(structuredClone(champions[0]), save), null);
  assert.ok(lockReason(structuredClone(champions[1]), save));
});
