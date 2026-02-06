/**
 * 占星计算工具类
 * 用于计算星盘数据
 */
class AstrologyCalculator {
  constructor(envName = 'prod-5gg03znv016787f1') {
    this.envName = envName
    this.PLANET_IDS = [
      { id: 0, name: 'Sun', chineseName: '太阳', symbol: '☉' },       // Sun
      { id: 1, name: 'Moon', chineseName: '月亮', symbol: '☽' },     // Moon
      { id: 2, name: 'Mercury', chineseName: '水星', symbol: '☿' },   // Mercury
      { id: 3, name: 'Venus', chineseName: '金星', symbol: '♀' },    // Venus
      { id: 4, name: 'Mars', chineseName: '火星', symbol: '♂' },     // Mars
      { id: 5, name: 'Jupiter', chineseName: '木星', symbol: '♃' },  // Jupiter
      { id: 6, name: 'Saturn', chineseName: '土星', symbol: '♄' },   // Saturn
      { id: 7, name: 'Uranus', chineseName: '天王星', symbol: '♅' }, // Uranus
      { id: 8, name: 'Neptune', chineseName: '海王星', symbol: '♆' },// Neptune
      { id: 9, name: 'Pluto', chineseName: '冥王星', symbol: '♇' },  // Pluto
      { id: 10, name: 'MeanNode', chineseName: '月北交点', symbol: '☊' }, // Mean Node
      { id: 11, name: 'TrueNode', chineseName: '月南交点', symbol: '☋' } // True Node
    ]

    this.HOUSE_SYSTEM_CODES = {
      'placidus': 'P',
      'koch': 'K',
      'equal': 'E',
      'campanus': 'C',
      'regiomontanus': 'R',
      'porphyrius': 'O',
      'morinus': 'Q'
    }
  }

  /**
   * 计算星盘数据
   * @param {Object} params - 参数对象
   * @param {number} params.year - 年份
   * @param {number} params.month - 月份
   * @param {number} params.day - 日期
   * @param {number} params.hour - 小时
   * @param {number} params.minute - 分钟
   * @param {number} params.lat - 纬度
   * @param {number} params.lng - 经度
   * @param {string} params.houseSystem - 宫位制
   * @param {number} params.timeZone - 时区
   * @returns {Promise<Object>} 星盘数据
   */
  async calculateChart(params) {
    const { year, month, day, hour, minute, lat, lng, houseSystem = 'placidus', timeZone = 8 } = params

    return new Promise(async (resolve, reject) => {
      try {
        // 连接到云服务
        const socketTask = await this.connectToService()

        // 转换为 UTC 日期对象
        const dateObj = this.toUTCDateObject({ year, month, day, hour, minute, timeZone })

        // 构建行星请求
        const planetRequests = this.PLANET_IDS.map(p => ({
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

        // Julian day 请求
        const juldayRequest = {
          func: 'swe_julday',
          args: [dateObj.year, dateObj.month, dateObj.day, dateObj.hour, 1]
        }

        const houseSystemCode = this.HOUSE_SYSTEM_CODES[houseSystem] || 'P'
        const TIMEOUT = 30000

        const planets = []
        let julianDay = null
        let housesReceived = false
        let housesData = null

        // 设置超时
        const timeout = setTimeout(() => {
          socketTask.close()
          reject(new Error(`计算超时: 收到 ${planets.length} 颗行星`))
        }, TIMEOUT)

        // 监听消息
        const handleMessage = (res) => {
          clearTimeout(timeout)

          try {
            const result = JSON.parse(res.data)

            // 处理 Julian Day
            if (result.result && typeof result.result === 'number') {
              const jd = typeof result.result === 'number' ? result.result : (result.result.julianDay || result.result.jd)
              if (jd && jd > 2000000) {
                julianDay = jd

                // 请求宫位
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
                return
              }
            }

            // 处理行星数据
            if (result.result && result.result.body && result.result.body.position && result.result.body.position.longitude) {
              const planetId = parseInt(result.result.body.id)
              const planetInfo = this.PLANET_IDS.find(p => p.id === planetId)
              if (planetInfo) {
                const existingPlanet = planets.find(p => p.name === planetInfo.name)
                if (existingPlanet) return

                const longitude = result.result.body.position.longitude.decimalDegree || result.result.body.position.longitude

                planets.push({
                  name: planetInfo.name,
                  chineseName: planetInfo.chineseName,
                  symbol: planetInfo.symbol,
                  longitude: longitude,
                  degree: longitude
                })
              }
            }

            // 处理宫位数据
            if (result.result && (result.result.cusps || result.result.house)) {
              housesReceived = true
              const cusps = result.result.cusps || result.result.house
              let houses = []
              let ascendant = 0
              let midheaven = 0

              if (Array.isArray(cusps)) {
                if (cusps.length === 13) {
                  houses = cusps.slice(1, 13)
                } else if (cusps.length === 12) {
                  houses = cusps
                } else {
                  houses = cusps.slice(0, 12)
                }
              }

              if (result.result.ascmc) {
                ascendant = result.result.ascmc[0] || houses[0] || 0
                midheaven = result.result.ascmc[1] || houses[9] || 0
              } else {
                ascendant = houses[0] || 0
                midheaven = houses[9] || 0
              }

              housesData = { houses, ascendant, midheaven }
            }

            // 检查是否收到所有数据
            if (planets.length === this.PLANET_IDS.length && housesReceived && housesData) {
              clearTimeout(timeout)

              // 计算相位
              const aspects = this.calculateAspects(planets)

              // 构建最终星盘数据
              const chartData = {
                planets: planets.map(p => ({
                  name: p.chineseName,
                  englishName: p.name,
                  symbol: p.symbol,
                  degree: p.longitude,
                  longitude: p.longitude
                })),
                houses: housesData.houses,
                ascendant: housesData.ascendant,
                midheaven: housesData.midheaven,
                aspects: aspects,
                julianDay: julianDay
              }

              resolve(chartData)
            }
          } catch (e) {
            reject(e)
          } finally {
            if (planets.length === this.PLANET_IDS.length && housesReceived && housesData) {
              socketTask.close()
            }
          }
        }

        socketTask.onMessage(handleMessage)

        socketTask.onError((err) => {
          clearTimeout(timeout)
          reject(err)
          socketTask.close()
        })

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
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 连接到占星服务
   */
  connectToService() {
    return new Promise(async (resolve, reject) => {
      try {
        const { socketTask } = await wx.cloud.connectContainer({
          config: {
            env: this.envName
          },
          service: 'express-v2qc',
          path: '/ws'
        })

        await new Promise((innerResolve, innerReject) => {
          const openTimeout = setTimeout(() => {
            innerReject(new Error('连接建立超时'))
          }, 10000)

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
  toUTCDateObject({ year, month, day, hour, minute, timeZone }) {
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
   * 计算行星相位
   */
  calculateAspects(planets) {
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
}

module.exports = AstrologyCalculator
