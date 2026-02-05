// pages/home/home.js
Page({
  data: {
    messages: [],
    inputMessage: '',
    connected: false,
    socketTask: null,
    envName: 'prod-5gg03znv016787f1',
    serviceName: 'express-v2qc',
    // 新增星盘相关数据
    hasBirthInfo: false,
    birthInfo: null,
    chartData: null,
    isLoading: false,
    isLoadingChart: false
  },

  onLoad() {
    this.loadBirthInfo()
  },

  // 新增：加载出生信息
  loadBirthInfo() {
    try {
      const birthInfo = wx.getStorageSync('birthInfo')
      const chartData = wx.getStorageSync('chartData')

      this.setData({
        hasBirthInfo: !!birthInfo,
        birthInfo: birthInfo,
        chartData: chartData
      })

      if (birthInfo && !chartData) {
        // 如果有出生信息但没有星盘数据，则尝试加载
        this.loadChartData()
      } else if (birthInfo && chartData) {
        // 如果已经有星盘数据，直接绘制
        setTimeout(() => {
          this.drawStarChart()
        }, 300)
      }
    } catch (e) {
      console.error('加载出生信息失败:', e)
    }
  },

  // 新增：加载星盘数据
  async loadChartData() {
    if (this.data.isLoading || !this.data.birthInfo) return

    this.setData({ isLoading: true })

    try {
      const birthInfo = this.data.birthInfo

      // 解析出生日期和时间
      const [year, month, day] = birthInfo.birthDate.split('-').map(Number)
      const [hour, minute] = birthInfo.birthTime.split(':').map(Number)

      // 使用占星API计算星盘
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

      // 绘制星盘
      setTimeout(() => {
        this.drawStarChart()
      }, 300)
    } catch (error) {
      console.error('加载星盘数据失败:', error)
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 新增：计算星盘
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
            env: this.data.envName
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
            console.error('connectContainer failed', err)
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
            if (result.result && typeof result.result === 'number') {
              const jd = typeof result.result === 'number' ? result.result : (result.result.julianDay || result.result.jd)
              if (jd && jd > 2000000) { // Valid Julian Day range
                julianDay = jd

                // Now request house cusps
                const housesRequest = {
                  type: 'swisseph',
                  data: [{
                    func: 'swe_houses',
                    args: [{julianDay, lat, lng, houseSystemCode}]
                  }]
                }

                socketTask.send({
                  data: JSON.stringify(
                    housesRequest
                  )
                })
                return
              }
            }

            // Check for planet result
            if (result.result && result.result.body && result.result.body.position && result.result.body.position.longitude) {
              const planetId = parseInt(result.result.body.id)
              const planetInfo = PLANET_IDS.find(p => p.id === planetId)
              if (planetInfo) {
                // 检查是否已经收到过这颗行星
                const existingPlanet = planets.find(p => p.name === planetInfo.name)
                if (existingPlanet) {
                  return
                }

                const longitude = result.result.body.position.longitude.decimalDegree ||
                result.result.body.position.longitude

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
            if (result.result && (result.result.cusps || result.result.house)) {
              housesReceived = true
              const cusps = result.result.cusps || result.result.house
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

              if (result.result.ascmc) {
                ascendant = result.result.ascmc[0] || houses[0] || 0
                midheaven = result.result.ascmc[1] || houses[9] || 0
              } else {
                ascendant = houses[0] || 0
                midheaven = houses[9] || 0
              }

              housesData = { houses, ascendant, midheaven }
              console.log("housesData", housesData)
            }

            // Check if we have all data
            if (planets.length === PLANET_IDS.length && housesReceived && housesData) {
              clearTimeout(timeout)

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
            if (planets.length === PLANET_IDS.length && housesReceived && housesData) {
              // 关闭连接
              socketTask.close()
              console.log("home.vue socketTask.close()")
            }
          }
        }

        // 监听消息
        socketTask.onMessage(handleMessage)

        // 监听失败
        socketTask.onError((err) => {
          clearTimeout(timeout)
          reject(err)
          socketTask.close()
        })

        // 发送计算请求
        // 1. 遍历数组，把每个行星请求单独发送
        planetRequests.forEach(request => {
          socketTask.send({
            data: JSON.stringify({
              "type": "swisseph",
              "data": [request] // 注意：这里必须还是数组格式，哪怕只有一个元素
            })
          });
        })

        // 2. 单独发送 julday 请求
        socketTask.send({
          data: JSON.stringify({
            "type": "swisseph",
            "data": [juldayRequest] // 包装成单元素数组
          })
        })
      } catch (error) {
        reject(error)
      }
    })
  },

  // 新增：格式化出生信息
  formatBirthInfo() {
    const { birthInfo } = this.data
    if (!birthInfo) return ''

    const { birthDate, birthTime, location } = birthInfo
    const city = location?.city || '未知地点'
    return `${birthDate} ${birthTime} · ${city}`
  },

  // 新增：获取太阳星座符号
  getSunSignSymbol() {
    const sunSign = this.getSunSign()
    return sunSign.symbol || '☉'
  },

  // 新增：获取太阳星座
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

  // 新增：获取月亮星座
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

  // 新增：获取上升星座
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

  // 新增：绘制星盘
  drawStarChart() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#starChart').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        const width = res[0].width
        const height = res[0].height

        const ctx = wx.createCanvasContext('starChart', this)
        const size = Math.min(width, height)
        const centerX = size / 2
        const centerY = size / 2
        const radiusOuter = size * 0.42  // 减小外圆半径
        const radiusInner = size * 0.32
        const radiusCenter = size * 0.25
        const houseRadius = size * 0.37

        // 绘制背景 - 深蓝色星空
        const gradient = ctx.createLinearGradient(0, 0, size, size)
        gradient.addColorStop(0, '#0a0e27')
        gradient.addColorStop(1, '#0d1136')
        ctx.setFillStyle(gradient)
        ctx.fillRect(0, 0, size, size)

        // 绘制12星座背景扇形（参考图片的配色）
        const zodiacColors = [
          '#ff6b6b', // 白羊座 - 红色
          '#ffd166', // 金牛座 - 黄色
          '#06d6a0', // 双子座 - 绿色
          '#118ab2', // 巨蟹座 - 青色
          '#ef476f', // 狮子座 - 粉红
          '#073b4c', // 处女座 - 深蓝
          '#6c5ce7', // 天秤座 - 紫色
          '#a29bfe', // 天蝎座 - 淡紫
          '#00cec9', // 射手座 - 青绿
          '#2d3436', // 摩羯座 - 灰黑
          '#fd79a8', // 水瓶座 - 粉色
          '#6c5ce7'  // 双鱼座 - 紫色
        ]

        for (let i = 0; i < 12; i++) {
          const startAngle = (i * 30 - 90) * Math.PI / 180
          const endAngle = ((i + 1) * 30 - 90) * Math.PI / 180

          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.arc(centerX, centerY, radiusOuter + size * 0.02, startAngle, endAngle)
          ctx.closePath()
          ctx.setFillStyle(zodiacColors[i])
          ctx.setGlobalAlpha(0.15)
          ctx.fill()
          ctx.setGlobalAlpha(1.0)
        }

        // 绘制外圆 - 星座圈（带光晕）
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI)
        ctx.setStrokeStyle('#4d80e4')
        ctx.setLineWidth(2)
        ctx.stroke()

        // 绘制内圆 - 宫位圈
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusInner, 0, 2 * Math.PI)
        ctx.setStrokeStyle('#2c5282')
        ctx.setLineWidth(1)
        ctx.stroke()

        // 绘制中心圆（带光晕）
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusCenter, 0, 2 * Math.PI)
        ctx.setStrokeStyle('#3b82f6')
        ctx.setLineWidth(2)
        ctx.stroke()

        // 中心圆填充 - 渐变（改用简单填充，不支持createRadialGradient）
        // const centerGradient = ctx.createRadialGradient(
        //   centerX, centerY, 0,
        //   centerX, centerY, radiusCenter
        // )
        // centerGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)')
        // centerGradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)')
        // ctx.setFillStyle(centerGradient)
        ctx.setFillStyle('rgba(59, 130, 246, 0.1)')
        ctx.fill()

        // 绘制12星座分隔线（从中心到外圈）
        for (let i = 0; i < 12; i++) {
          const angle = (i * 30 - 90) * Math.PI / 180
          const x1 = centerX + Math.cos(angle) * radiusCenter * 0.6
          const y1 = centerY + Math.sin(angle) * radiusCenter * 0.6
          const x2 = centerX + Math.cos(angle) * (radiusOuter + size * 0.01)
          const y2 = centerY + Math.sin(angle) * (radiusOuter + size * 0.01)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.setStrokeStyle('rgba(255, 255, 255, 0.1)')
          ctx.setLineWidth(1)
          ctx.stroke()
        }

        // 绘制12宫位线（参考图片的淡蓝色）
        const { chartData } = this.data
        if (chartData && chartData.houses && chartData.houses.length >= 12) {
          for (let i = 0; i < 12; i++) {
            const angle = (chartData.houses[i] - 90) * Math.PI / 180
            const x1 = centerX + Math.cos(angle) * (radiusOuter - size * 0.03)
            const y1 = centerY + Math.sin(angle) * (radiusOuter - size * 0.03)
            const x2 = centerX + Math.cos(angle) * radiusCenter
            const y2 = centerY + Math.sin(angle) * radiusCenter

            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.setStrokeStyle('#3b82f6')
            ctx.setLineWidth(1.5)
            ctx.stroke()

            // 绘制宫位数字（浅蓝色）
            const textAngle = angle + Math.PI / 12
            const textX = centerX + Math.cos(textAngle) * houseRadius
            const textY = centerY + Math.sin(textAngle) * houseRadius

            ctx.setFontSize(size * 0.033)
            ctx.setFillStyle('#93c5fd')
            ctx.setTextAlign('center')
            ctx.setTextBaseline('middle')
            ctx.fillText(`${i + 1}`, textX, textY)
          }
        }

        // 绘制上升点 (ASC) - 金色
        if (chartData && chartData.ascendant) {
          const ascAngle = (chartData.ascendant - 90) * Math.PI / 180
          const ascX1 = centerX + Math.cos(ascAngle) * radiusOuter
          const ascY1 = centerY + Math.sin(ascAngle) * radiusOuter
          const ascX2 = centerX + Math.cos(ascAngle) * (radiusCenter - size * 0.02)
          const ascY2 = centerY + Math.sin(ascAngle) * (radiusCenter - size * 0.02)

          ctx.beginPath()
          ctx.moveTo(ascX1, ascY1)
          ctx.lineTo(ascX2, ascY2)
          ctx.setStrokeStyle('#fbbf24')
          ctx.setLineWidth(2.5)
          ctx.stroke()

          // ASC 标记背景圆点
          ctx.beginPath()
          const ascDotRadius = size * 0.03
          ctx.arc(ascX2, ascY2, ascDotRadius, 0, 2 * Math.PI)
          ctx.setFillStyle('#fbbf24')
          ctx.fill()

          // 绘制 ASC 标记（金色）
          const ascTextX = centerX + Math.cos(ascAngle) * (radiusCenter - size * 0.05)
          const ascTextY = centerY + Math.sin(ascAngle) * (radiusCenter - size * 0.05)
          ctx.setFontSize(size * 0.032)
          ctx.setFillStyle('#fbbf24')
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')
          ctx.fillText('ASC', ascTextX, ascTextY)
        }

        // 绘制中天 (MC) - 青色
        if (chartData && chartData.midheaven) {
          const mcAngle = (chartData.midheaven - 90) * Math.PI / 180
          const mcX1 = centerX + Math.cos(mcAngle) * radiusOuter
          const mcY1 = centerY + Math.sin(mcAngle) * radiusOuter
          const mcX2 = centerX + Math.cos(mcAngle) * (radiusCenter - size * 0.02)
          const mcY2 = centerY + Math.sin(mcAngle) * (radiusCenter - size * 0.02)

          ctx.beginPath()
          ctx.moveTo(mcX1, mcY1)
          ctx.lineTo(mcX2, mcY2)
          ctx.setStrokeStyle('#06b6d4')
          ctx.setLineWidth(2.5)
          ctx.stroke()

          // MC 标记背景圆点
          ctx.beginPath()
          const mcDotRadius = size * 0.03
          ctx.arc(mcX2, mcY2, mcDotRadius, 0, 2 * Math.PI)
          ctx.setFillStyle('#06b6d4')
          ctx.fill()

          // 绘制 MC 标记（青色）
          const mcTextX = centerX + Math.cos(mcAngle) * (radiusCenter - size * 0.05)
          const mcTextY = centerY + Math.sin(mcAngle) * (radiusCenter - size * 0.05)
          ctx.setFontSize(size * 0.032)
          ctx.setFillStyle('#06b6d4')
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')
          ctx.fillText('MC', mcTextX, mcTextY)
        }

        // 绘制行星（白色，带光晕效果）
        if (chartData && chartData.planets) {
          chartData.planets.forEach(planet => {
            const angle = (planet.degree - 90) * Math.PI / 180
            const planetRadius = (radiusInner + radiusCenter) / 2
            const x = centerX + Math.cos(angle) * planetRadius
            const y = centerY + Math.sin(angle) * planetRadius

            ctx.setFontSize(size * 0.045)
            ctx.setFillStyle('#ffffff')
            ctx.setTextAlign('center')
            ctx.setTextBaseline('middle')
            ctx.fillText(planet.symbol, x, y)
          })
        }

        // 绘制黄道十二宫符号（淡蓝色，更大更清晰）
        for (let i = 0; i < 12; i++) {
          const signAngle = (i * 30 - 90) * Math.PI / 180
          const signRadius = radiusOuter + size * 0.035
          const x = centerX + Math.cos(signAngle) * signRadius
          const y = centerY + Math.sin(signAngle) * signRadius

          const zodiacSigns = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
          ctx.setFontSize(size * 0.038)
          ctx.setFillStyle('#60a5fa')
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')
          ctx.fillText(zodiacSigns[i], x, y)
        }

        // 绘制标题（白色，加粗，加光晕）
        ctx.setFontSize(size * 0.045)
        ctx.setFillStyle('#ffffff')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('top')
        ctx.fillText('我的星盘', centerX, size * 0.035)

        // 标题光晕效果
        ctx.setFontSize(size * 0.045)
        ctx.setFillStyle('rgba(96, 165, 250, 0.3)')
        ctx.fillText('我的星盘', centerX, size * 0.035)

        // 添加星辰点缀（小圆点）
        ctx.setFillStyle('#ffffff')
        for (let i = 0; i < 20; i++) {
          const starAngle = Math.random() * 2 * Math.PI
          const starRadius = (radiusInner + radiusCenter) / 2 + (Math.random() - 0.5) * size * 0.1
          const starX = centerX + Math.cos(starAngle) * starRadius
          const starY = centerY + Math.sin(starAngle) * starRadius
          const starSize = 0.5 + Math.random() * 1.5

          ctx.beginPath()
          ctx.arc(starX, starY, starSize, 0, 2 * Math.PI)
          ctx.fill()
        }

        ctx.draw()
      }
    })
  }
})
