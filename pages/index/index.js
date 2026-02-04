// pages/index/index.js
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
    isLoading: false
  },

  onLoad() {
    this.addSystemMessage('小程序已加载，点击连接按钮开始连接云服务')
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
    } catch (error) {
      console.error('加载星盘数据失败:', error)
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 新增：计算星盘
  async calculateChart(params) {
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

  // 新增：跳转到输入页面
  goToInput() {
    wx.navigateTo({
      url: '/pages/astrology-input/astrology-input'
    })
  },

  // 新增：跳转到星盘页面
  goToChart() {
    wx.navigateTo({
      url: '/pages/astrology-result/astrology-result'
    })
  },

  // 连接云服务
  connectCloud() {
    if (this.data.connected) {
      wx.showToast({
        title: '已连接',
        icon: 'none'
      })
      return
    }

    this.addSystemMessage('正在连接云服务...')
    wx.showLoading({
      title: '连接中...',
      mask: true
    })

    wx.cloud.connectContainer({
      config: {
        env: this.data.envName
      },
      service: this.data.serviceName,
      path: '/ws'
    })
      .then(({ socketTask }) => {
        wx.hideLoading()
        this.setData({ socketTask, connected: true })

        this.addSystemMessage('✅ 连接成功')

        // 监听消息
        socketTask.onMessage((res) => {
          this.addMessage('收到: ' + res.data, 'received')
        })

        // 连接打开
        socketTask.onOpen((res) => {
          this.addSystemMessage('WebSocket 已打开')
          // 发送初始消息（空消息）
          socketTask.send({ data: '' })
        })

        // 连接关闭
        socketTask.onClose((res) => {
          this.addSystemMessage('❌ 连接已断开')
          this.setData({ connected: false, socketTask: null })
        })

        // 连接错误
        socketTask.onError((err) => {
          this.addSystemMessage('❌ 连接错误: ' + JSON.stringify(err))
          wx.hideLoading()
          wx.showToast({
            title: '连接失败',
            icon: 'none'
          })
          this.setData({ connected: false, socketTask: null })
        })
      })
      .catch(err => {
        wx.hideLoading()
        this.addSystemMessage('❌ 连接失败: ' + JSON.stringify(err))
        wx.showToast({
          title: '连接失败',
          icon: 'none'
        })
      })
  },

  // 断开连接
  disconnect() {
    if (!this.data.connected) {
      wx.showToast({
        title: '未连接',
        icon: 'none'
      })
      return
    }

    if (this.data.socketTask) {
      this.data.socketTask.close({
        success: () => {
          this.addSystemMessage('已断开连接')
          this.setData({ connected: false, socketTask: null })
        },
        fail: (err) => {
          console.error('断开连接失败', err)
        }
      })
    }
  },

  // 发送消息
  sendMessage() {
    if (!this.data.connected) {
      wx.showToast({
        title: '请先连接',
        icon: 'none'
      })
      return
    }

    const message = this.data.inputMessage.trim()
    if (!message) {
      wx.showToast({
        title: '消息不能为空',
        icon: 'none'
      })
      return
    }

    if (this.data.socketTask) {
      this.data.socketTask.send({
        data: message,
        success: () => {
          this.addMessage('发送: ' + message, 'sent')
          this.setData({ inputMessage: '' })
        },
        fail: (err) => {
          this.addSystemMessage('❌ 发送失败: ' + JSON.stringify(err))
        }
      })
    }
  },

  // 输入框变化
  onInput(e) {
    this.setData({ inputMessage: e.detail.value })
  },

  // 添加消息到列表
  addMessage(text, type = 'system') {
    const messages = this.data.messages
    messages.push({
      text: text,
      type: type,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    })
    this.setData({ messages: messages })

    // 滚动到底部
    wx.nextTick(() => {
      this.pageScrollToBottom()
    })
  },

  // 添加系统消息
  addSystemMessage(text) {
    this.addMessage(text, 'system')
  },

  // 滚动到底部
  pageScrollToBottom() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#message-list').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      if (res[1] && res[0]) {
        wx.pageScrollTo({
          scrollTop: res[1].scrollTop + res[0].height,
          duration: 100
        })
      }
    })
  },

  // 清空消息
  clearMessages() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有消息吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [] })
          this.addSystemMessage('消息已清空')
        }
      }
    })
  }
})
