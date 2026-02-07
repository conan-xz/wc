/**
 * 占星计算工具类
 * 用于计算星盘数据
 */
const {
  PLANET_IDS,
  HOUSE_SYSTEM_CODES,
  CLOUD_CONFIG,
  CHART_CONFIG
} = require('./constants.js')

class AstrologyCalculator {
  constructor(envName = CLOUD_CONFIG.env) {
    this.envName = envName
    this._planets = []
  }

  /**
   * 计算星盘数据
   */
  async calculateChart(params) {
    this._planets = []

    const {
      year,
      month,
      day,
      hour,
      minute,
      lat,
      lng,
      houseSystem = 'placidus',
      timeZone = 8
    } = params

    const TIMEOUT = CHART_CONFIG.timeout
    let julianDay = null
    let housesReceived = false
    let housesData = null

    try {
      // 连接到云服务
      const socketTask = await this._connectToService()

      // 转换为 UTC 日期对象
      const dateObj = this._toUTCDateObject({
        year,
        month,
        day,
        hour,
        minute,
        timeZone
      })

      // 构建行星请求
      const planetRequests = this._buildPlanetRequests(dateObj, lat, lng)

      // Julian day 请求
      const juldayRequest = {
        func: 'swe_julday',
        args: [dateObj.year, dateObj.month, dateObj.day, dateObj.hour, 1]
      }

      const houseSystemCode = HOUSE_SYSTEM_CODES[houseSystem] || 'P'

      // 设置超时
      const timeoutId = setTimeout(() => {
        socketTask.close()
        throw new Error(`计算超时: 收到 ${planets.length} 颗行星`)
      }, TIMEOUT)

      return new Promise((resolve, reject) => {
        // 监听消息
        const handleMessage = (res) => {
          try {
            const result = JSON.parse(res.data)

            // 处理 Julian Day
            if (result.result && typeof result.result === 'number') {
              clearTimeout(timeoutId)
              const jd = this._extractJulianDay(result.result)
              if (jd && jd > 2000000) {
                julianDay = jd
                this._requestHouses(socketTask, julianDay, lat, lng, houseSystemCode)
                return
              }
            }

            // 处理行星数据
            if (this._isPlanetResult(result)) {
              clearTimeout(timeoutId)
              this._processPlanetResult(result.result)
            }

            // 处理宫位数据
            if (this._isHousesResult(result)) {
              clearTimeout(timeoutId)
              housesReceived = true
              housesData = this._processHousesResult(result.result)
            }

            // 检查是否收到所有数据
            if (this._planets.length === PLANET_IDS.length && housesReceived && housesData) {
              clearTimeout(timeoutId)

              // 计算相位
              const aspects = this._calculateAspects(this._planets)

              // 构建最终星盘数据
              const chartData = {
                planets: this._planets.map(p => ({
                  name: p.chineseName,
                  englishName: p.name,
                  symbol: p.symbol,
                  degree: p.longitude,
                  longitude: p.longitude
                })),
                houses: housesData.houses,
                ascendant: housesData.ascendant,
                midheaven: housesData.midheaven,
                aspects,
                julianDay
              }

              socketTask.close()
              resolve(chartData)
            }
          } catch (e) {
            clearTimeout(timeoutId)
            socketTask.close()
            reject(e)
          }
        }

        socketTask.onMessage(handleMessage)

        socketTask.onError((err) => {
          clearTimeout(timeoutId)
          socketTask.close()
          reject(err)
        })

        // 发送请求
        this._sendRequests(socketTask, planetRequests, juldayRequest)
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * 连接到占星服务
   */
  async _connectToService() {
    return new Promise(async (resolve, reject) => {
      try {
        const { socketTask } = await wx.cloud.connectContainer({
          config: { env: this.envName },
          service: CLOUD_CONFIG.service,
          path: CLOUD_CONFIG.wsPath
        })

        await new Promise((innerResolve, innerReject) => {
          const openTimeout = setTimeout(() => {
            innerReject(new Error('连接建立超时'))
          }, CHART_CONFIG.connectTimeout)

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

  /**
   * 转换为 UTC 日期对象
   */
  _toUTCDateObject({ year, month, day, hour, minute, timeZone }) {
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

  /**
   * 构建行星请求
   */
  _buildPlanetRequests(dateObj, lat, lng) {
    return PLANET_IDS.map(p => ({
      func: 'calc',
      args: [{
        date: { gregorian: { terrestrial: dateObj } },
        observer: {
          ephemeris: 'swisseph',
          geographic: { longitude: lng, latitude: lat, height: 0 }
        },
        body: {
          id: p.id,
          position: {}
        }
      }]
    }))
  }

  /**
   * 请求宫位
   */
  _requestHouses(socketTask, julianDay, lat, lng, houseSystemCode) {
    const housesRequest = {
      type: 'swisseph',
      data: [{
        func: 'swe_houses',
        args: [julianDay, lat, lng, houseSystemCode]
      }]
    }

    socketTask.send({
      data: JSON.stringify(housesRequest)
    })
  }

  /**
   * 发送请求
   */
  _sendRequests(socketTask, planetRequests, juldayRequest) {
    // 发送行星请求
    planetRequests.forEach(request => {
      socketTask.send({
        data: JSON.stringify({
          type: 'swisseph',
          data: [request]
        })
      })
    })

    // 发送 Julian day 请求
    socketTask.send({
      data: JSON.stringify({
        type: 'swisseph',
        data: [juldayRequest]
      })
    })
  }

  /**
   * 提取 Julian Day
   */
  _extractJulianDay(result) {
    return typeof result === 'number'
      ? result
      : (result.julianDay || result.jd)
  }

  /**
   * 判断是否为行星结果
   */
  _isPlanetResult(result) {
    return result.result &&
      result.result.body &&
      result.result.body.position &&
      result.result.body.position.longitude
  }

  /**
   * 处理行星结果
   */
  _processPlanetResult(result) {
    const planetId = parseInt(result.body.id)
    const planetInfo = PLANET_IDS.find(p => p.id === planetId)
    if (!planetInfo) return null

    // 防止重复
    if (this._planets.some(p => p.name === planetInfo.name)) return null

    const longitude =
      result.body.position.longitude.decimalDegree ||
      result.body.position.longitude

    const planet = {
      name: planetInfo.name,
      chineseName: planetInfo.chineseName,
      symbol: planetInfo.symbol,
      longitude,
      degree: longitude
    }

    this._planets.push(planet)
    return planet
  }

  /**
   * 判断是否为宫位结果
   */
  _isHousesResult(result) {
    return result.result && (result.result.cusps || result.result.house)
  }

  /**
   * 处理宫位结果
   */
  _processHousesResult(result) {
    const cusps = result.cusps || result.house
    let houses = []

    if (Array.isArray(cusps)) {
      if (cusps.length === 13) {
        houses = cusps.slice(1, 13)
      } else if (cusps.length === 12) {
        houses = cusps
      } else {
        houses = cusps.slice(0, 12)
      }
    }

    let ascendant = 0
    let midheaven = 0

    if (result.ascmc) {
      ascendant = result.ascmc[0] || houses[0] || 0
      midheaven = result.ascmc[1] || houses[9] || 0
    } else {
      ascendant = houses[0] || 0
      midheaven = houses[9] || 0
    }

    return { houses, ascendant, midheaven }
  }

  /**
   * 计算行星相位
   */
  _calculateAspects(planets) {
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
          if (
            diff <= aspectConfig.angle + aspectConfig.orb &&
            diff >= aspectConfig.angle - aspectConfig.orb
          ) {
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
}

module.exports = AstrologyCalculator
