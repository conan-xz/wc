/**
 * 数据存储管理模块
 */

const { getFromStorage, saveToStorage, formatHistory } = require('./helpers.js')

// 存储键名
const STORAGE_KEYS = {
  BIRTH_INFO: 'birthInfo',
  CHART_DATA: 'chartData',
  BIRTH_HISTORY: 'birthHistory'
}

/**
 * 获取出生信息
 */
function getBirthInfo() {
  return getFromStorage(STORAGE_KEYS.BIRTH_INFO)
}

/**
 * 保存出生信息
 */
function saveBirthInfo(birthInfo) {
  saveToStorage(STORAGE_KEYS.BIRTH_INFO, birthInfo)
}

/**
 * 获取星盘数据
 */
function getChartData() {
  return getFromStorage(STORAGE_KEYS.CHART_DATA)
}

/**
 * 保存星盘数据
 */
function saveChartData(chartData) {
  saveToStorage(STORAGE_KEYS.CHART_DATA, chartData)
}

/**
 * 获取历史记录
 */
function getHistory() {
  const history = getFromStorage(STORAGE_KEYS.BIRTH_HISTORY)
  return formatHistory(history)
}

/**
 * 保存历史记录
 */
function saveHistory(history) {
  saveToStorage(STORAGE_KEYS.BIRTH_HISTORY, history)
}

/**
 * 添加到历史记录（去重）
 */
function addToHistory(birthInfo, maxItems = 10) {
  let history = getHistory()

  // 去重：检查是否已有相同记录
  const isDuplicate = history.some(item =>
    item.birthDate === birthInfo.birthDate &&
    item.birthTime === birthInfo.birthTime &&
    item.location.city === birthInfo.location.city
  )

  if (isDuplicate) return history

  // 添加到最前面
  history = [birthInfo, ...history]

  // 限制最大数量
  if (history.length > maxItems) {
    history = history.slice(0, maxItems)
  }

  saveHistory(history)
  return history
}

/**
 * 清空历史记录
 */
function clearHistory() {
  wx.removeStorageSync(STORAGE_KEYS.BIRTH_HISTORY)
}

/**
 * 清除星盘数据（用于重新计算）
 */
function clearChartData() {
  wx.removeStorageSync(STORAGE_KEYS.CHART_DATA)
}

/**
 * 检查是否有出生信息
 */
function hasBirthInfo() {
  return !!getBirthInfo()
}

/**
 * 检查是否有星盘数据
 */
function hasChartData() {
  return !!getChartData()
}

module.exports = {
  getBirthInfo,
  saveBirthInfo,
  getChartData,
  saveChartData,
  getHistory,
  saveHistory,
  addToHistory,
  clearHistory,
  clearChartData,
  hasBirthInfo,
  hasChartData
}
