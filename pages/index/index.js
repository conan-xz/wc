// pages/index/index.js
const AstrologyCalculator = require('../../utils/astrologyCalculator')

Page({
  data: {
    // 星盘相关数据
    hasBirthInfo: false,
    birthInfo: null,
    chartData: null,
    // 历史记录
    history: []
  },

  onLoad() {
    this.loadBirthInfo()
    this.loadHistory()
  },

  // 加载出生信息
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
      }
    } catch (e) {
      console.error('加载出生信息失败:', e)
    }
  },

  // 加载历史记录
  loadHistory() {
    try {
      const history = wx.getStorageSync('birthHistory') || []
      this.setData({ history })
    } catch (e) {
      console.error('加载历史记录失败:', e)
    }
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return ''
    return dateStr.replace(/-/g, '.')
  },

  // 格式化出生信息
  formatBirthInfo() {
    const { birthInfo } = this.data
    if (!birthInfo) return ''

    const { birthDate, birthTime, location } = birthInfo
    const city = location?.city || '未知地点'
    return `${birthDate} ${birthTime} · ${city}`
  },

  // 获取太阳星座
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

  // 获取月亮星座
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

  // 获取上升星座
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

  // 跳转到输入页面
  goToInput() {
    wx.navigateTo({
      url: '/pages/astrology-input/astrology-input'
    })
  },

  // 跳转到首页
  goToHome() {
    wx.switchTab({
      url: '/pages/home/home'
    })
  },

  // 使用历史记录
  useHistory(e) {
    const item = e.currentTarget.dataset.item
    wx.setStorageSync('birthInfo', item)

    // 重新加载出生信息
    this.loadBirthInfo()

    wx.showToast({
      title: '已切换到该记录',
      icon: 'success'
    })
  },

  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('birthHistory')
          this.setData({ history: [] })
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 加载星盘数据
  async loadChartData() {
    if (!this.data.birthInfo) return

    try {
      const birthInfo = this.data.birthInfo
      const [year, month, day] = birthInfo.birthDate.split('-').map(Number)
      const [hour, minute] = birthInfo.birthTime.split(':').map(Number)

      const calculator = new AstrologyCalculator(this.data.envName || 'prod-5gg03znv016787f1')
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

      this.setData({ chartData })
      wx.setStorageSync('chartData', chartData)
    } catch (error) {
      console.error('加载星盘数据失败:', error)
    }
  }
})
