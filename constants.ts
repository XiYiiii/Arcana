


import { Keyword } from "./types";

export const MAX_HAND_SIZE = 3;
export const INITIAL_DECK_SIZE = 20;
export const INITIAL_HP = 40;
export const INITIAL_ATK = 2; 

export const PHASE_DESCRIPTIONS = {
  DRAW: "抽牌阶段：双方补充手牌至 3 张。触发 抽到 特效。",
  SET: "盖牌阶段：从手牌中盖置1张牌。可使用 插入(置牌前)。",
  REVEAL: "亮牌结算：包含 亮牌前 -> 翻开 -> 亮牌后 -> 结算特效。",
  DISCARD: "弃牌阶段：弃置手牌直到剩 3 张 (或更少)。触发 弃置 特效。",
};

export const SUIT_COLORS = {
  CUPS: "text-pink-500",
  SWORDS: "text-cyan-400",
  WANDS: "text-orange-500",
  PENTACLES: "text-yellow-500",
  TREASURE: "text-yellow-200",
  EMPTY: "text-slate-500"
};

export const SUIT_ICONS = {
  CUPS: "🏆", // 圣杯
  SWORDS: "⚔️", // 宝剑
  WANDS: "🪄", // 权杖
  PENTACLES: "🪙", // 星币
  TREASURE: "💎",
  EMPTY: "🔮"
};

export const KEYWORD_DISPLAY_NAMES: Record<Keyword, string> = {
  [Keyword.SCRY]: "占卜",
  [Keyword.CLASH]: "拼点",
  [Keyword.SEIZE]: "夺取",
  [Keyword.BLIND_SEIZE]: "盲夺",
  [Keyword.RETURN]: "归来",
  [Keyword.DESTROY]: "销毁",
  [Keyword.INVALIDATE]: "无效",
  [Keyword.REVERSE]: "反转",
  [Keyword.TREASURE]: "宝藏",
  [Keyword.IMPRINT]: "标记",
  [Keyword.SUBSTITUTE]: "替身",
  [Keyword.PIERCE]: "穿透",
  [Keyword.SHUFFLE]: "打乱",
  [Keyword.FIELD]: "场地",
  [Keyword.QUEST]: "任务",
  [Keyword.LOCK]: "锁定",
  [Keyword.TRANSFORM]: "变化",
};

export const KEYWORD_DESCRIPTIONS: Record<Keyword, string> = {
  [Keyword.SCRY]: "查看抽牌堆顶的牌。",
  [Keyword.CLASH]: "比较Rank序号。序号相同视为平局(无视花色)；否则序号大者胜。",
  [Keyword.SEIZE]: "观看对方手牌，然后获取其中一张。",
  [Keyword.BLIND_SEIZE]: "在不观看对方手牌的前提下，获取对方一张手牌。",
  [Keyword.RETURN]: "从弃牌堆中获取一张牌置入手牌。",
  [Keyword.DESTROY]: "销毁一张牌，使其移出游戏(不进入弃牌堆)。",
  [Keyword.INVALIDATE]: "令目标牌的效果不触发。",
  [Keyword.REVERSE]: "令效果的目标颠倒。",
  [Keyword.TREASURE]: "无法被无效、反转、置换、夺取或锁定的强力卡牌。",
  [Keyword.IMPRINT]: "赋予卡牌的额外效果标记。",
  [Keyword.SUBSTITUTE]: "将此牌置于场上，并替原本的卡牌承受效果。",
  [Keyword.PIERCE]: "该伤害无视免疫效果。",
  [Keyword.SHUFFLE]: "随机打乱抽牌堆顺序。",
  [Keyword.FIELD]: "设置一个持续生效的场地环境，直到被新的场地取代或被弃置。",
  [Keyword.QUEST]: "获得一个持续的任务，完成条件后触发效果。上限2个。",
  [Keyword.LOCK]: "被锁定的卡牌无法被打出，直到下一回合。",
  [Keyword.TRANSFORM]: "将牌随机变为另一张牌（不包含宝藏牌）。",
};
