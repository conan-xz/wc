/**
 * 通用工具函数
 */

// 根据度数获取星座
function getZodiacSignByDegree(degree) {
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

// 转换为 UTC 日期对象
function toUTCDateObject({ year, month, day, hour, minute, timeZone }) {
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0)
  const utcTime = localDate.getTime() - (timeZone * 60 * 60 * 1000)
  const utcDate = new Date(utcTime)

  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
    hour: utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60
  }
}

// 计算行星相位
function calculateAspects(planets) {
  const aspects = []
  const aspectOrbs = {
    'conjunction': { angle: 0, orb: 8 },
    'opposition': { angle: 180, orb: 8 },
    'trine': { angle: 120, orb: 8 },
    'square': { angle: 90, orb: 8 },
    'sextile': { angle: 60, orb: 6 },
    'quincunx': { angle: 150, orb: 3 },
    'semi-sextile': { angle: 30, orb: 2 },
    'sesquiquadrate': { angle: 135, orb: 2 }
  }

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i]
      const planet2 = planets[j]

      const diff = Math.min(
        Math.abs(planet1.longitude - planet2.longitude),
        360 - Math.abs(planet1.longitude - planet2.longitude)
      )

      for (const [aspectName, aspectConfig] of Object.entries(aspectOrbs)) {
        if (diff <= aspectConfig.angle + aspectConfig.orb && diff >= aspectConfig.angle - aspectConfig.orb) {
          aspects.push({
            name: aspectName,
            degree: diff,
            planet1: planet1.name,
            planet2: planet2.name
          })
          break
        }
      }
    }
  }

  return aspects
}

// 格式化出生信息
function formatBirthInfo(birthInfo) {
  if (!birthInfo) return ''

  const { birthDate, birthTime, location } = birthInfo
  const city = location?.city || '未知地点'
  return `${birthDate} ${birthTime} · ${city}`
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.replace(/-/g, '.')
}

// 格式化坐标
function formatCoords(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`
}

// 连接到云服务
function connectToService({ env, service, path, timeout = 10000 } = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { socketTask } = await wx.cloud.connectContainer({
        config: { env },
        service,
        path
      })

      await new Promise((innerResolve, innerReject) => {
        const openTimeout = setTimeout(() => {
          innerReject(new Error('连接建立超时'))
        }, timeout)

        socketTask.onOpen(() => {
          clearTimeout(openTimeout)
          innerResolve()
        })

        socketTask.onError((err) => {
          clearTimeout(openTimeout)
          innerReject(err)
        })
      })

      resolve(socketTask)
    } catch (error) {
      reject(error)
    }
  })
}

// 创建 WebSocket 请求
function sendWebSocketRequest(socketTask, requestData, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socketTask.close()
      reject(new Error('请求超时'))
    }, timeout)

    socketTask.onMessage((res) => {
      clearTimeout(timeoutId)

      try {
        let result = res.data
        if (typeof result === 'string') {
          result = JSON.parse(result)
        }
        if (result.result) {
          resolve(result.result)
        } else {
          reject(new Error(result.error || '请求失败'))
        }
      } catch (e) {
        reject(e)
      } finally {
        socketTask.close()
      }
    })

    socketTask.onError((err) => {
      clearTimeout(timeoutId)
      reject(err)
      socketTask.close()
    })

    socketTask.send({
      data: JSON.stringify(requestData)
    })
  })
}

// 保存到本地存储
function saveToStorage(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.error(`保存到存储失败 (${key}):`, e)
  }
}

// 从本地存储读取
function getFromStorage(key, defaultValue = null) {
  try {
    const value = wx.getStorageSync(key)
    return value ? value : defaultValue
  } catch (e) {
    console.error(`从存储读取失败 (${key}):`, e)
    return defaultValue
  }
}

// 格式化历史记录
function formatHistory(history) {
  if (!history) return []

  // 确保是数组
  if (typeof history === 'string') {
    try {
      return JSON.parse(history) || []
    } catch (e) {
      return []
    }
  }

  return Array.isArray(history) ? history : []
}

module.exports = {
  getZodiacSignByDegree,
  toUTCDateObject,
  calculateAspects,
  formatBirthInfo,
  formatDate,
  formatCoords,
  connectToService,
  sendWebSocketRequest,
  saveToStorage,
  getFromStorage,
  formatHistory
}
