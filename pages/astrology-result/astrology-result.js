// pages/astrology-result/astrology-result.js
Page({
  data: {
    hasBirthInfo: false,
    birthInfo: null,
    chartData: null,
    isLoading: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      const birthInfo = wx.getStorageSync('birthInfo')
      const chartData = wx.getStorageSync('chartData')

      this.setData({
        hasBirthInfo: !!birthInfo,
        birthInfo: birthInfo,
        chartData: chartData
      })

      if (!chartData) {
        // 如果没有缓存的星盘数据，尝试重新计算
        await this.loadChartData()
      }
    } catch (e) {
      console.error('加载数据失败:', e)
    }
  },

  /**
   * 加载星盘数据
   */
  async loadChartData() {
    const { birthInfo } = this.data
    if (!birthInfo) return

    this.setData({ isLoading: true })

    try {
      // 解析出生日期和时间
      const [year, month, day] = birthInfo.birthDate.split('-').map(Number)
      const [hour, minute] = birthInfo.birthTime.split(':').map(Number)

      // 连接云服务计算星盘
      const chartData = await this.calculateChart({
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

      this.setData({ chartData })

      // 保存到本地存储
      wx.setStorageSync('chartData', chartData)
    } catch (error) {
      console.error('加载星盘数据失败:', error)
      wx.showToast({
        title: '加载星盘失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /**
   * 计算星盘
   */
  async calculateChart(params) {
    const { year, month, day, hour, minute, lat, lng, houseSystem = 'placidus', timeZone = 8 } = params

    // Define planet IDs for calculation (matching Swiss Ephemeris IDs)
    const PLANET_IDS = [
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

    // Define house system codes
    const HOUSE_SYSTEM_CODES = {
      'placidus': 'P',
      'koch': 'K',
      'equal': 'E',
      'campanus': 'C',
      'regiomontanus': 'R',
      'porphyrius': 'O',
      'morinus': 'Q'
    }

    // Helper to convert to UTC date object
    const toUTCDateObject = ({ year, month, day, hour, minute, timeZone }) => {
      // Create a date object considering timezone
      const localDate = new Date(year, month - 1, day, hour, minute, 0, 0)
      const utcTime = localDate.getTime() - (timeZone * 60 * 60 * 1000)
      const utcDate = new Date(utcTime)

      return {
        year: utcDate.getUTCFullYear(),
        month: utcDate.getUTCMonth() + 1, // month is 0-indexed in JS
        day: utcDate.getUTCDate(),
        hour: utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60
      }
    }

    // Helper to calculate aspects
    const calculateAspects = (planets) => {
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

    return new Promise(async (resolve, reject) => {
      try {
        const socketTask = await wx.cloud.connectContainer({
          config: {
            env: 'prod-5gg03znv016787f1'  // 使用当前环境
          },
          service: 'express-v2qc',  // 占星计算服务
          path: '/ws'
        }).then(result => result.socketTask)

        // 等待连接建立
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

        // Convert to UTC date object
        const dateObj = toUTCDateObject({ year, month, day, hour, minute, timeZone })

        // Build planet requests
        const planetRequests = PLANET_IDS.map(p => ({
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

        // Julian day request
        const juldayRequest = {
          func: 'swe_julday',
          args: [dateObj.year, dateObj.month, dateObj.day, dateObj.hour, 1]
        }

        // House system code
        const houseSystemCode = HOUSE_SYSTEM_CODES[houseSystem] || 'P'

        const TIMEOUT = 30000

        const planets = []
        let julianDay = null
        let housesReceived = false
        let housesData = null

        // 设置超时
        const timeout = setTimeout(() => {
          socketTask.close()
          reject(new Error(`计算超时: 收到 ${planets.length} 颗行星, JD=${julianDay}, 房屋=${housesReceived}`))
        }, TIMEOUT)

        // 监听消息
        const handleMessage = (res) => {
          clearTimeout(timeout)

          try {
            const result = JSON.parse(res.data)

            // Check for Julian Day result
            if (typeof result === 'number' || (result && !result.body && !result.house && !result.cusps)) {
              const jd = typeof result === 'number' ? result : (result.julianDay || result.jd)
              if (jd && jd > 2000000) { // Valid Julian Day range
                julianDay = jd

                // Now request house cusps
                const housesRequest = {
                  func: 'swe_houses',
                  args: [julianDay, lat, lng, houseSystemCode]
                }

                socketTask.send({
                  data: JSON.stringify([
                    housesRequest
                  ])
                })
                return
              }
            }

            // Check for planet result
            if (result && result.body && result.body.position && result.body.position.longitude) {
              const planetId = parseInt(result.body.id)
              const planetInfo = PLANET_IDS.find(p => p.id === planetId)
              if (planetInfo) {
                // 检查是否已经收到过这颗行星
                const existingPlanet = planets.find(p => p.name === planetInfo.name)
                if (existingPlanet) {
                  return
                }

                const longitude = result.body.position.longitude.decimalDegree ||
                                  result.body.position.longitude

                planets.push({
                  name: planetInfo.name,
                  chineseName: planetInfo.chineseName,
                  symbol: planetInfo.symbol,
                  longitude: longitude,
                  degree: longitude // alias for chart.vue compatibility
                })
              }
            }

            // Check for house result
            if (result && (result.cusps || result.house)) {
              housesReceived = true
              const cusps = result.cusps || result.house

              // swe_houses returns cusps[0] as unused, cusps[1-12] are house cusps
              // ascmc[0] = ASC, ascmc[1] = MC
              let houses = []
              let ascendant = 0
              let midheaven = 0

              if (Array.isArray(cusps)) {
                // If cusps has 13 elements, skip index 0
                if (cusps.length === 13) {
                  houses = cusps.slice(1, 13)
                } else if (cusps.length === 12) {
                  houses = cusps
                } else {
                  houses = cusps.slice(0, 12)
                }
              }

              if (result.ascmc) {
                ascendant = result.ascmc[0] || houses[0] || 0
                midheaven = result.ascmc[1] || houses[9] || 0
              } else {
                ascendant = houses[0] || 0
                midheaven = houses[9] || 0
              }

              housesData = { houses, ascendant, midheaven }
            }

            // Check if we have all data
            if (planets.length === PLANET_IDS.length && housesReceived && housesData) {
              clearTimeout(timeout)
              socketTask.offMessage(handleMessage)

              // Calculate aspects
              const aspects = calculateAspects(planets)

              // Build final chart data compatible with chart.vue
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
            if (planets.length >= PLANET_IDS.length && !housesReceived && !housesData) {
              // Only close if we haven't resolved yet
              socketTask.close()
            }
          }
        }

        socketTask.onMessage(handleMessage)

        socketTask.onError((err) => {
          clearTimeout(timeout)
          socketTask.offMessage(handleMessage)
          reject(err)
          socketTask.close()
        })

        // 发送计算请求
        socketTask.send({
          data: JSON.stringify([...planetRequests, juldayRequest])
        })
      } catch (error) {
        reject(error)
      }
    })
  },

  /**
   * 格式化出生信息
   */
  formatBirthInfo() {
    const { birthInfo } = this.data
    if (!birthInfo) return ''

    const { birthDate, birthTime, location } = birthInfo
    const city = location?.city || '未知地点'
    return `${birthDate} ${birthTime} · ${city}`
  },

  /**
   * 获取太阳星座符号
   */
  getSunSignSymbol() {
    const sunSign = this.getSunSign()
    return sunSign.symbol || '☉'
  },

  /**
   * 获取太阳星座
   */
  getSunSign() {
    const { chartData } = this.data
    if (!chartData || !chartData.planets) {
      return { name: '未知', symbol: '?' }
    }

    const sun = chartData.planets.find(p => p.englishName === 'Sun' || p.name === '太阳')
    if (!sun) return { name: '未知', symbol: '?' }

    const signIndex = Math.floor(sun.degree / 30)
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
  },

  /**
   * 获取月亮星座
   */
  getMoonSign() {
    const { chartData } = this.data
    if (!chartData || !chartData.planets) {
      return { name: '未知', symbol: '?' }
    }

    const moon = chartData.planets.find(p => p.englishName === 'Moon' || p.name === '月亮')
    if (!moon) return { name: '未知', symbol: '?' }

    const signIndex = Math.floor(moon.degree / 30)
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
  },

  /**
   * 获取上升星座
   */
  getAscSign() {
    const { chartData } = this.data
    if (!chartData || !chartData.ascendant) {
      return { name: '未知', symbol: '?' }
    }

    const signIndex = Math.floor(chartData.ascendant / 30)
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
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  /**
   * 编辑信息
   */
  editInfo() {
    wx.redirectTo({
      url: '/pages/astrology-input/astrology-input'
    })
  },

  /**
   * 分享星盘
   */
  shareChart() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  }
})