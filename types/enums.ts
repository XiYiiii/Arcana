
export enum GamePhase {
  DRAW = 'DRAW',
  SET = 'SET',
  REVEAL = 'REVEAL', // Now handles Before Reveal, Reveal, After Reveal, Resolve
  DISCARD = 'DISCARD',
  GAME_OVER = 'GAME_OVER', // New Phase
}

export enum InstantWindow {
  NONE = 'NONE',
  BEFORE_SET = 'BEFORE_SET',      // "置牌前"
  BEFORE_REVEAL = 'BEFORE_REVEAL', // "亮牌前"
  AFTER_REVEAL = 'AFTER_REVEAL',   // "亮牌后" (翻开后，特效前)
  AFTER_EFFECT = 'AFTER_EFFECT',   // "特效后" (未实现通用逻辑，保留扩展位)
}

export enum CardSuit {
  CUPS = 'CUPS',
  SWORDS = 'SWORDS',
  WANDS = 'WANDS',
  PENTACLES = 'PENTACLES',
  EMPTY = 'EMPTY',
  TREASURE = 'TREASURE', // Special Suit for Treasures
}

export enum Keyword {
  SCRY = 'SCRY',         // 占卜
  CLASH = 'CLASH',       // 拼点
  SEIZE = 'SEIZE',       // 夺取
  BLIND_SEIZE = 'BLIND_SEIZE', // 盲夺
  RETURN = 'RETURN',     // 归来
  DESTROY = 'DESTROY',   // 销毁
  INVALIDATE = 'INVALIDATE', // 无效
  REVERSE = 'REVERSE',   // 反转
  TREASURE = 'TREASURE', // 宝藏
  IMPRINT = 'IMPRINT',   // 印记
  SUBSTITUTE = 'SUBSTITUTE', // 替身
  PIERCE = 'PIERCE',     // 穿透
  SHUFFLE = 'SHUFFLE',   // 打乱
  FIELD = 'FIELD',       // 场地
  QUEST = 'QUEST',       // 任务
  LOCK = 'LOCK',         // 锁定
  TRANSFORM = 'TRANSFORM', // 变化
}

// New AI Tags
export enum AITag {
  DAMAGE = 'DAMAGE',       // 造成伤害
  HEAL = 'HEAL',           // 恢复生命
  DRAW = 'DRAW',           // 抽牌
  DISCARD = 'DISCARD',     // 弃牌 (己方或对方)
  BUFF = 'BUFF',           // 增益 (加攻、免疫、双倍等)
  DEBUFF = 'DEBUFF',       // 减益 (减攻、禁疗、反转、无效等)
  CONTROL = 'CONTROL',     // 控制 (夺取、锁定、交换、场地操作)
  TRANSFORM = 'TRANSFORM', // 变化
  FIELD = 'FIELD',         // 设置场地
  SPECIAL = 'SPECIAL',     // 特殊 (任务、获取宝藏、特殊胜利)
}
