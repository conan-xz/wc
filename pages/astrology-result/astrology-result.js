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

        // 设置超时
        const timeout = setTimeout(() => {
          socketTask.close()
          reject(new Error('计算超时'))
        }, 30000)

        // 监听消息
        socketTask.onMessage((res) => {
          clearTimeout(timeout)

          try {
            const result = JSON.parse(res.data)

            if (result.success) {
              resolve(result.data)
            } else {
              reject(new Error(result.error || '星盘计算失败'))
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

        // 发送计算请求
        socketTask.send({
          data: JSON.stringify({
            type: 'calc',
            params: params
          })
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