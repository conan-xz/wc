/**
 * 共享常量定义
 */

// 星座名称和符号
const ZODIAC_SIGNS = [
  { name: '白羊座', symbol: '♈', en: 'Aries' },
  { name: '金牛座', symbol: '♉', en: 'Taurus' },
  { name: '双子座', symbol: '♊', en: 'Gemini' },
  { name: '巨蟹座', symbol: '♋', en: 'Cancer' },
  { name: '狮子座', symbol: '♌', en: 'Leo' },
  { name: '处女座', symbol: '♍', en: 'Virgo' },
  { name: '天秤座', symbol: '♎', en: 'Libra' },
  { name: '天蝎座', symbol: '♏', en: 'Scorpio' },
  { name: '射手座', symbol: '♐', en: 'Sagittarius' },
  { name: '摩羯座', symbol: '♑', en: 'Capricorn' },
  { name: '水瓶座', symbol: '♒', en: 'Aquarius' },
  { name: '双鱼座', symbol: '♓', en: 'Pisces' }
]

// 行星信息
const PLANET_IDS = [
  { id: 0, name: 'Sun', chineseName: '太阳', symbol: '☉' },
  { id: 1, name: 'Moon', chineseName: '月亮', symbol: '☽' },
  { id: 2, name: 'Mercury', chineseName: '水星', symbol: '☿' },
  { id: 3, name: 'Venus', chineseName: '金星', symbol: '♀' },
  { id: 4, name: 'Mars', chineseName: '火星', symbol: '♂' },
  { id: 5, name: 'Jupiter', chineseName: '木星', symbol: '♃' },
  { id: 6, name: 'Saturn', chineseName: '土星', symbol: '♄' },
  { id: 7, name: 'Uranus', chineseName: '天王星', symbol: '♅' },
  { id: 8, name: 'Neptune', chineseName: '海王星', symbol: '♆' },
  { id: 9, name: 'Pluto', chineseName: '冥王星', symbol: '♇' },
  { id: 10, name: 'MeanNode', chineseName: '月北交点', symbol: '☊' },
  { id: 11, name: 'TrueNode', chineseName: '月南交点', symbol: '☋' }
]

// 宫位系统代码
const HOUSE_SYSTEM_CODES = {
  'placidus': 'P',
  'koch': 'K',
  'equal': 'E',
  'campanus': 'C',
  'regiomontanus': 'R',
  'porphyrius': 'O',
  'morinus': 'Q'
}

// 宫位信息
const HOUSES = [
  { number: '①', name: '自我宫', index: 0 },
  { number: '②', name: '财富宫', index: 1 },
  { number: '③', name: '交流宫', index: 2 },
  { number: '④', name: '家庭宫', index: 3 },
  { number: '⑤', name: '创造力宫', index: 4 },
  { number: '⑥', name: '健康宫', index: 5 },
  { number: '⑦', name: '伴侣宫', index: 6 },
  { number: '⑧', name: '转变宫', index: 7 },
  { number: '⑨', name: '哲学宫', index: 8 },
  { number: '⑩', name: '事业宫', index: 9 },
  { number: '⑪', name: '社交宫', index: 10 },
  { number: '⑫', name: '灵性宫', index: 11 }
]

// 相位信息
const ASPECTS = {
  'conjunction': { angle: 0, orb: 8, symbol: '☌', name: '合相' },
  'opposition': { angle: 180, orb: 8, symbol: '☍', name: '对冲' },
  'trine': { angle: 120, orb: 8, symbol: '△', name: '三分相' },
  'square': { angle: 90, orb: 8, symbol: '□', name: '四分相' },
  'sextile': { angle: 60, orb: 6, symbol: '⚹', name: '六分相' },
  'quincunx': { angle: 150, orb: 3, symbol: '⚻', name: '五合相' },
  'semi-sextile': { angle: 30, orb: 2, symbol: '⚺', name: '半六分相' },
  'sesquiquadrate': { angle: 135, orb: 2, symbol: '⚼', name: '半四分相' }
}

// 云环境配置
const CLOUD_CONFIG = {
  env: 'prod-5gg03znv016787f1',
  service: 'express-v2qc',
  wsPath: '/ws'
}

// 星盘绘制配置
const CHART_CONFIG = {
  timeout: 30000,
  connectTimeout: 10000,
  defaultCenterY: 1.1
}

module.exports = {
  ZODIAC_SIGNS,
  PLANET_IDS,
  HOUSE_SYSTEM_CODES,
  HOUSES,
  ASPECTS,
  CLOUD_CONFIG,
  CHART_CONFIG
}
