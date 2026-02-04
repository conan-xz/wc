// pages/astrology-input/astrology-input.js
Page({
  data: {
    birthDate: '',
    birthTime: '',
    timeUncertain: false,
    timeUncertaintyIndex: 0,
    timeUncertaintyOptions: ['确定', '±5分钟', '±15分钟', '±30分钟', '±1小时', '不确定'],
    location: {
      city: '',
      lat: 0,
      lng: 0
    },
    searchQuery: '',
    cityResults: [],
    timeZone: null,
    timeZoneName: '',
    currentDate: '',
    history: []
  },

  onLoad() {
    this.setCurrentDate()
    this.loadHistory()
    this.loadSavedBirthInfo()
  },

  /**
   * 设置当前日期
   */
  setCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    this.setData({
      currentDate: `${year}-${month}-${day}`
    })
  },

  /**
   * 加载历史记录
   */
  loadHistory() {
    try {
      const saved = wx.getStorageSync('birthHistory')
      const history = saved ? JSON.parse(saved) : []
      this.setData({
        history: history
      })
    } catch (e) {
      console.error('加载历史记录失败:', e)
      this.setData({
        history: []
      })
    }
  },

  /**
   * 加载已保存的出生信息
   */
  loadSavedBirthInfo() {
    try {
      const saved = wx.getStorageSync('birthInfo')
      if (saved) {
        this.setData({
          birthDate: saved.birthDate,
          birthTime: saved.birthTime,
          location: saved.location,
          timeZone: saved.timeZone,
          timeZoneName: saved.timeZoneName
        })
      }
    } catch (e) {
      console.error('加载保存的出生信息失败:', e)
    }
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      birthDate: e.detail.value
    })
    this.updateTimeZone()
  },

  /**
   * 时间选择
   */
  onTimeChange(e) {
    this.setData({
      birthTime: e.detail.value
    })
  },

  /**
   * 时间不确定度选择
   */
  onUncertaintyChange(e) {
    const timeUncertaintyIndex = parseInt(e.detail.value)
    this.setData({
      timeUncertaintyIndex: timeUncertaintyIndex,
      timeUncertain: timeUncertaintyIndex >= 2
    })
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const value = e.detail?.value || ''
    this.setData({
      searchQuery: value
    })
  },

  /**
   * 搜索城市（使用后端地理编码服务）
   */
  async searchCity() {
    const { searchQuery } = this.data
    if (!searchQuery || !searchQuery.trim()) {
      wx.showToast({
        title: '请输入城市名称',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '搜索中...' })

      // 使用云服务进行地理编码
      const result = await this.geocodeAddress(searchQuery)

      if (result) {
        this.setData({
          location: {
            city: result.name,
            lat: result.lat,
            lng: result.lng
          },
          cityResults: []
        })

        wx.showToast({
          title: `已定位: ${result.name}`,
          icon: 'success'
        })

        // 获取时区信息
        await this.updateTimeZone()
      }
    } catch (error) {
      wx.showToast({
        title: '未找到该地址',
        icon: 'none'
      })
      console.error('搜索城市失败:', error)
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 地理编码服务
   */
  async geocodeAddress(address) {
    return new Promise(async (resolve, reject) => {
      try {
        const { socketTask } = await wx.cloud.connectContainer({
          "config": {
            "env": "prod-5gg03znv016787f1"
          },
          "service": "express-v2qc",
          "path": "/ws"
        })

        // 设置超时
        const timeout = setTimeout(() => {
          socketTask.close()
          reject(new Error('地理编码请求超时'))
        }, 10000)

        // 监听消息
        socketTask.onMessage((res) => {
          clearTimeout(timeout)

          try {
            let result = res.data
            if (typeof result === 'string') {
              result = JSON.parse(result)
            }
            if (result.result) {
              resolve(result.result)
            } else {
              reject(new Error(result.error || '地理编码失败'))
            }
          } catch (e) {
            reject(e)
          } finally {
            socketTask.close()
          }
        })

        socketTask.onError((err) => {
          clearTimeout(timeout)
          reject(err)
          socketTask.close()
        })

        socketTask.onOpen(() => {
          // 发送地理编码请求
          socketTask.send({
            data: JSON.stringify({
              type: 'amap',
              data: [{func: 'geocode', args: [ address ]}]
            })
          })
        })

        socketTask.onClose(() => {
          clearTimeout(timeout)
        })
      } catch (error) {
        reject(error)
      }
    })
  },

  /**
   * 选择城市
   */
  async selectCity(e) {
    const { city } = e.currentTarget.dataset
    this.setData({
      location: {
        city: city.name,
        lat: city.lat,
        lng: city.lng
      },
      cityResults: [],
      searchQuery: city.name
    })

    // 获取时区信息
    await this.updateTimeZone()
  },

  /**
   * 更新时区（中国统一使用东八区）
   */
  async updateTimeZone() {
    const { location } = this.data
    if (!location.lat || !location.lng) {
      return
    }

    // 中国统一使用东八区（UTC+8）
    this.setData({
      timeZone: 8,
      timeZoneName: '中国标准时间 (CST)'
    })
  },

  /**
   * 格式化坐标
   */
  formatCoords(lat, lng) {
    const latDir = lat >= 0 ? 'N' : 'S'
    const lngDir = lng >= 0 ? 'E' : 'W'
    return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
  },

  /**
   * 使用历史记录
   */
  useHistory(e) {
    const { item } = e.currentTarget.dataset
    this.setData({
      birthDate: item.birthDate,
      birthTime: item.birthTime,
      location: item.location,
      timeZone: item.timeZone,
      timeZoneName: item.timeZoneName
    })
  },

  /**
   * 验证表单
   */
  validate() {
    const { birthDate, birthTime, location } = this.data

    if (!birthDate) {
      wx.showToast({
        title: '请选择出生日期',
        icon: 'none'
      })
      return false
    }

    if (!birthTime) {
      wx.showToast({
        title: '请选择出生时间',
        icon: 'none'
      })
      return false
    }

    if (!location.city) {
      wx.showToast({
        title: '请选择出生地点',
        icon: 'none'
      })
      return false
    }

    return true
  },

  /**
   * 提交表单
   */
  async submit() {
    if (!this.validate()) {
      return
    }

    const birthInfo = {
      birthDate: this.data.birthDate,
      birthTime: this.data.birthTime,
      location: this.data.location,
      timeZone: this.data.timeZone,
      timeZoneName: this.data.timeZoneName,
      timeUncertainty: this.data.timeUncertaintyOptions[this.data.timeUncertaintyIndex]
    }

    try {
      // 保存出生信息
      wx.setStorageSync('birthInfo', birthInfo)

      // 保存到历史记录
      this.saveToHistory(birthInfo)

      // 连接到云服务计算星盘
      await this.generateChart(birthInfo)
    } catch (error) {
      console.error('提交失败:', error)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  },

  /**
   * 生成星盘
   */
  async generateChart(birthInfo) {
    wx.showLoading({ title: '生成星盘中...' })

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

    try {
      // 连接到云服务计算星盘
      const socketTask = await this.connectToAstrologyService()

      // 解析出生日期和时间
      const [year, month, day] = birthInfo.birthDate.split('-').map(Number)
      const [hour, minute] = birthInfo.birthTime.split(':').map(Number)

      // Convert to UTC date object
      const dateObj = toUTCDateObject({ year, month, day, hour, minute, timeZone: birthInfo.timeZone || 8 })

      // Build planet requests
      const planetRequests = PLANET_IDS.map(p => ({
        func: 'calc',
        args: [{
          date: { gregorian: { terrestrial: dateObj } },
          observer: {
            ephemeris: 'swisseph',
            geographic: { longitude: birthInfo.location.lng, latitude: birthInfo.location.lat, height: 0 }
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
      const houseSystemCode = HOUSE_SYSTEM_CODES['placidus'] || 'P'

      const TIMEOUT = 30000

      const planets = []
      let julianDay = null
      let housesReceived = false
      let housesData = null

      // 等待响应
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('计算超时'))
          socketTask.close()
        }, TIMEOUT)

        // 监听消息
        const handleMessage = (res) => {
          clearTimeout(timeout)

          try {
            const result = JSON.parse(res.data)

            // Check for Julian Day result
            if (typeof result.result === 'number' || (result && !result.body && !result.house && !result.cusps)) {
              const jd = typeof result === 'number' ? result : (result.julianDay || result.jd)
              if (jd && jd > 2000000) { // Valid Julian Day range
                julianDay = jd

                // Now request house cusps
                const housesRequest = {
                  type: 'swisseph',
                  data: {
                    func: 'swe_houses',
                    args: [julianDay, birthInfo.location.lat, birthInfo.location.lng, houseSystemCode]
                  }                  
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
              console.log("housesData", housesData)
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

              // 保存星盘数据
              wx.setStorageSync('chartData', chartData)

              wx.hideLoading()
              wx.showToast({
                title: '星盘生成成功',
                icon: 'success'
              })

              // 跳转到星盘展示页面
              wx.redirectTo({
                url: '/pages/astrology-result/astrology-result'
              })

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

        // 监听消息
        socketTask.onMessage(handleMessage)

        // 监听失败
        socketTask.onError((err) => {
          clearTimeout(timeout)
          socketTask.offMessage(handleMessage)
          reject(err)
          socketTask.close()
        })

        // 发送计算请求
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
      })
    } catch (error) {
      console.error('生成星盘失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '星盘生成失败',
        icon: 'none'
      })
    }
  },

  /**
   * 连接到占星服务
   */
  connectToAstrologyService() {
    return new Promise(async (resolve, reject) => {
      try {
        const { socketTask } = await wx.cloud.connectContainer({
          config: {
            env: 'prod-5gg03znv016787f1'  // 使用当前环境
          },
          service: 'express-v2qc',  // 占星计算服务
          path: '/ws'
        })

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

        resolve(socketTask)
      } catch (error) {
        reject(error)
      }
    })
  },

  /**
   * 保存到历史记录
   */
  saveToHistory(birthInfo) {
    let history = []
    try {
      const saved = wx.getStorageSync('birthHistory')
      history = saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('读取历史记录失败:', e)
    }

    // 去重
    history = history.filter(item => {
      return item.birthDate !== birthInfo.birthDate ||
             item.birthTime !== birthInfo.birthTime ||
             item.location.city !== birthInfo.location.city
    })

    history.unshift(birthInfo)

    // 最多保存10条
    if (history.length > 10) {
      history.pop()
    }

    this.setData({
      history: history
    })

    wx.setStorageSync('birthHistory', JSON.stringify(history))
  }
})