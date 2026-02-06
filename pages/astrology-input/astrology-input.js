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

    try {
      // 引入占星计算工具
      const AstrologyCalculator = require('../../utils/astrologyCalculator.js')
      const calculator = new AstrologyCalculator()

      // 解析出生日期和时间
      const [year, month, day] = birthInfo.birthDate.split('-').map(Number)
      const [hour, minute] = birthInfo.birthTime.split(':').map(Number)

      // 调用计算方法
      const chartData = await calculator.calculateChart({
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

      // 保存星盘数据
      wx.setStorageSync('chartData', chartData)

      wx.hideLoading()
      wx.showToast({
        title: '星盘生成成功',
        icon: 'success',
        duration: 1500
      })

      // 等待 toast 显示完成后跳转
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/home/home'
        })
      }, 1600)
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