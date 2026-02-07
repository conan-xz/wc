/**
 * 页面辅助工具模块
 */

const {
  getBirthInfo,
  getChartData,
  saveChartData
} = require('./storageManager.js')
const AstrologyCalculator = require('./astrologyCalculator.js')

/**
 * 获取太阳星座
 */
function getSunSign(chartData) {
  if (!chartData || !chartData.planets) {
    return { name: '太阳', symbol: '☉' }
  }

  const sun = chartData.planets.find(p =>
    p.englishName === 'Sun' || p.name === '太阳'
  )
  if (!sun) return { name: '未知', symbol: '?' }

  return _getZodiacSignByDegree(sun.degree)
}

/**
 * 获取月亮星座
 */
function getMoonSign(chartData) {
  if (!chartData || !chartData.planets) {
    return { name: '月亮', symbol: '☽' }
  }

  const moon = chartData.planets.find(p =>
    p.englishName === 'Moon' || p.name === '月亮'
  )
  if (!moon) return { name: '未知', symbol: '?' }

  return _getZodiacSignByDegree(moon.degree)
}

/**
 * 获取上升星座
 */
function getAscSign(chartData) {
  if (!chartData || !chartData.ascendant) {
    return { name: '上升', symbol: '☊' }
  }

  return _getZodiacSignByDegree(chartData.ascendant)
}

/**
 * 获取星座符号
 */
function getSunSignSymbol(chartData) {
  const sunSign = getSunSign(chartData)
  return sunSign.symbol || '☉'
}

/**
 * 根据度数获取星座
 */
function _getZodiacSignByDegree(degree) {
  const signIndex = Math.floor(degree / 30)
  const zodiacSigns = [
    { name: '白羊座', symbol: '♈' },
    { name: '金牛座', symbol: '♉' },
    { name: '双子座', symbol: '♊' },
    { name: '巨蟹座', symbol: '♋' },
    { name: '狮子座', symbol: '♌' },
    { name: '处女座', symbol: '♍' },
    { name: '天秤座', symbol: '♎' },
    { name: '天蝎座', symbol: '♏' },
    { name: '射手座', symbol: '♐' },
    { name: '摩羯座', symbol: '♑' },
    { name: '水瓶座', symbol: '♒' },
    { name: '双鱼座', symbol: '♓' }
  ]
  return zodiacSigns[signIndex] || { name: '未知', symbol: '?' }
}

/**
 * 加载星盘数据（从本地或重新计算）
 */
async function loadChartData(envName = 'prod-5gg03znv016787f1') {
  const birthInfo = getBirthInfo()
  if (!birthInfo) {
    throw new Error('没有出生信息')
  }

  // 先尝试从本地获取
  let chartData = getChartData()
  if (chartData) {
    return chartData
  }

  // 本地没有，重新计算
  const [year, month, day] = birthInfo.birthDate.split('-').map(Number)
  const [hour, minute] = birthInfo.birthTime.split(':').map(Number)

  const calculator = new AstrologyCalculator(envName)
  chartData = await calculator.calculateChart({
    year,
    month,
    day,
    hour,
    minute,
    lat: birthInfo.location.lat,
    lng: birthInfo.location.lng,
    houseSystem: 'placidus',
    timeZone: birthInfo.timeZone || 8
  })

  saveChartData(chartData)
  return chartData
}

/**
 * 更新核心三星座数据
 */
function updateCoreSigns(page, chartData) {
  const sunSign = getSunSign(chartData)
  const moonSign = getMoonSign(chartData)
  const ascSign = getAscSign(chartData)

  page.setData({
    sunSign,
    moonSign,
    ascSign
  })
}

module.exports = {
  getSunSign,
  getMoonSign,
  getAscSign,
  getSunSignSymbol,
  loadChartData,
  updateCoreSigns
}
