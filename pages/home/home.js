// pages/home/home.js
const AstrologyCalculator = require('../../utils/astrologyCalculator')

Page({
  data: {
    messages: [],
    inputMessage: '',
    connected: false,
    socketTask: null,
    envName: 'prod-5gg03znv016787f1',
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

      // 使用公共计算器计算星盘
      const calculator = new AstrologyCalculator(this.data.envName)
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

      // 保存到本地存储
      wx.setStorageSync('chartData', chartData)

      // 绘制星盘
      setTimeout(() => {
        this.drawStarChart()
      }, 300)
    } catch (error) {
      console.error('加载星盘数据失败:', error)
      wx.showToast({
        title: error.message || '星盘计算失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
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

        const { chartData } = this.data

        // 绘制星空背景
        ctx.setFillStyle('#0f172a') // slate-900
        ctx.fillRect(0, 0, size, size)

        // 绘制深邃星云渐变
        const nebulaGradient = ctx.createLinearGradient(0, 0, size, size)
        nebulaGradient.addColorStop(0, 'rgba(30, 58, 138, 0.15)') // blue-900
        nebulaGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)') // blue-500
        nebulaGradient.addColorStop(1, 'rgba(79, 70, 229, 0.12)') // indigo-600
        ctx.setFillStyle(nebulaGradient)
        ctx.fillRect(0, 0, size, size)

        // 添加星辰点缀（背景星点）
        ctx.setFillStyle('rgba(255, 255, 255, 0.6)')
        for (let i = 0; i < 80; i++) {
          const starAngle = Math.random() * 2 * Math.PI
          const starRadius = Math.random() * radiusOuter * 0.9
          const starX = centerX + Math.cos(starAngle) * starRadius
          const starY = centerY + Math.sin(starAngle) * starRadius
          const starSize = 0.3 + Math.random() * 0.8

          ctx.beginPath()
          ctx.arc(starX, starY, starSize, 0, 2 * Math.PI)
          ctx.fill()
        }

        // 绘制星座扇形背景（柔和的色块）- 固定从 0° 开始，逆时针排列（倒序：双鱼→白羊）
        const zodiacColors = [
          'rgba(138, 43, 226, 0.06)',   // 双鱼 330°
          'rgba(253, 121, 168, 0.06)', // 水瓶 300°
          'rgba(45, 52, 54, 0.06)',    // 摩羯 270°
          'rgba(0, 206, 201, 0.06)',   // 射手 240°
          'rgba(162, 155, 254, 0.06)', // 天蝎 210°
          'rgba(108, 92, 231, 0.06)',  // 天秤 180°
          'rgba(7, 59, 76, 0.06)',     // 处女 150°
          'rgba(239, 71, 111, 0.06)',  // 狮子 120°
          'rgba(17, 138, 178, 0.06)',  // 巨蟹 90°
          'rgba(6, 214, 160, 0.06)',   // 双子 60°
          'rgba(255, 209, 102, 0.06)', // 金牛 30°
          'rgba(255, 107, 107, 0.06)'  // 白羊 0°
        ]

        for (let i = 0; i < 12; i++) {
          const startDeg = i * 30
          const endDeg = (i + 1) * 30

          const startAngle = startDeg * Math.PI / 180
          const endAngle = endDeg * Math.PI / 180

          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.arc(centerX, centerY, radiusOuter - size * 0.02, startAngle, endAngle, false)
          ctx.closePath()
          ctx.setFillStyle(zodiacColors[i])
          ctx.fill()
        }

        // 绘制外圆 - 星座圈（精致的蓝色边框）
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI)
        ctx.setStrokeStyle('rgba(96, 165, 250, 0.7)') // blue-400
        ctx.setLineWidth(2)
        ctx.stroke()

        // 外圆光晕效果
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI)
        ctx.setStrokeStyle('rgba(96, 165, 250, 0.2)')
        ctx.setLineWidth(8)
        ctx.stroke()

        // 绘制内圆 - 宫位圈
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusInner, 0, 2 * Math.PI)
        ctx.setStrokeStyle('rgba(79, 70, 229, 0.6)') // indigo-600
        ctx.setLineWidth(1.5)
        ctx.stroke()

        // 绘制中心圆
        ctx.beginPath()
        ctx.arc(centerX, centerY, radiusCenter, 0, 2 * Math.PI)
        ctx.setStrokeStyle('rgba(59, 130, 246, 0.8)') // blue-500
        ctx.setLineWidth(2)
        ctx.stroke()

        // 中心圆填充 - 柔和光晕
        ctx.setFillStyle('rgba(59, 130, 246, 0.08)')
        ctx.fill()

        // 绘制 ASC-MC-DSC-IC 轴线（四轴线）
        if (chartData) {
          // ASC (上升点)
          if (chartData.ascendant) {
            const ascAngle = (chartData.ascendant) * Math.PI / 180
            const ascX1 = centerX + Math.cos(ascAngle) * radiusOuter
            const ascY1 = centerY + Math.sin(ascAngle) * radiusOuter
            const ascX2 = centerX - Math.cos(ascAngle) * radiusOuter
            const ascY2 = centerY - Math.sin(ascAngle) * radiusOuter

            ctx.beginPath()
            ctx.moveTo(ascX1, ascY1)
            ctx.lineTo(ascX2, ascY2)
            ctx.setStrokeStyle('#fbbf24')
            ctx.setLineWidth(2.5)
            ctx.stroke()
          }

          // MC (中天)
          if (chartData.midheaven) {
            const mcAngle = (chartData.midheaven) * Math.PI / 180
            const mcX1 = centerX + Math.cos(mcAngle) * radiusOuter
            const mcY1 = centerY + Math.sin(mcAngle) * radiusOuter
            const mcX2 = centerX - Math.cos(mcAngle) * radiusOuter
            const mcY2 = centerY - Math.sin(mcAngle) * radiusOuter

            ctx.beginPath()
            ctx.moveTo(mcX1, mcY1)
            ctx.lineTo(mcX2, mcY2)
            ctx.setStrokeStyle('#06b6d4')
            ctx.setLineWidth(2.5)
            ctx.stroke()
          }
        }

        // 绘制12宫位线 - 从 ASC 开始顺时针编号 1-12
        if (chartData && chartData.houses && chartData.houses.length >= 12) {
          // houses[0] = ASC = 1宫起点，houses[1] = 2宫起点，以此类推
          // 从 ASC 开始，顺时针排列（索引递减）
          for (let i = 0; i < 12; i++) {
            const houseIndex = (12 - i) % 12  // 0, 11, 10, 9, ..., 1
            const angle = chartData.houses[houseIndex] * Math.PI / 180
            const x1 = centerX + Math.cos(angle) * (radiusOuter - size * 0.03)
            const y1 = centerY + Math.sin(angle) * (radiusOuter - size * 0.03)
            const x2 = centerX + Math.cos(angle) * radiusCenter
            const y2 = centerY + Math.sin(angle) * radiusCenter

            // 宫位线
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.setStrokeStyle('rgba(147, 197, 253, 0.8)')
            ctx.setLineWidth(1.5)
            ctx.stroke()

            // 宫位线端点小圆点
            ctx.beginPath()
            ctx.arc(x1, y1, size * 0.008, 0, 2 * Math.PI)
            ctx.setFillStyle('rgba(147, 197, 253, 0.6)')
            ctx.fill()

            // 宫位数字（顺时针排列）
            const nextIndex = (houseIndex + 11) % 12  // 顺时针的下一个宫位
            const nextAngle = chartData.houses[nextIndex] * Math.PI / 180

            // 计算中点角度
            let midAngle
            const diff = Math.abs(nextAngle - angle)
            if (diff < Math.PI) {
              midAngle = (angle + nextAngle) / 2
            } else {
              midAngle = (angle + nextAngle + 2 * Math.PI) / 2
              if (midAngle > 2 * Math.PI) midAngle -= 2 * Math.PI
            }

            const textX = centerX + Math.cos(midAngle) * houseRadius
            const textY = centerY + Math.sin(midAngle) * houseRadius

            ctx.setFontSize(size * 0.035)
            ctx.setFillStyle('#e0e7ff')
            ctx.setTextAlign('center')
            ctx.setTextBaseline('middle')
            ctx.fillText(`${i + 1}`, textX, textY + 1)
            ctx.setFillStyle('#93c5fd')
            ctx.fillText(`${i + 1}`, textX, textY)
          }
        }

        // 绘制上升点 (ASC) - 金色光晕
        if (chartData && chartData.ascendant) {
          const ascAngle = (chartData.ascendant) * Math.PI / 180
          const ascX1 = centerX + Math.cos(ascAngle) * radiusOuter
          const ascY1 = centerY + Math.sin(ascAngle) * radiusOuter
          const ascX2 = centerX - Math.cos(ascAngle) * radiusOuter
          const ascY2 = centerY - Math.sin(ascAngle) * radiusOuter

          // ASC 轴线光晕
          ctx.beginPath()
          ctx.moveTo(ascX1, ascY1)
          ctx.lineTo(ascX2, ascY2)
          ctx.setStrokeStyle('rgba(251, 191, 36, 0.2)') // amber-400
          ctx.setLineWidth(10)
          ctx.stroke()

          // ASC 轴线
          ctx.beginPath()
          ctx.moveTo(ascX1, ascY1)
          ctx.lineTo(ascX2, ascY2)
          ctx.setStrokeStyle('rgba(251, 191, 36, 0.9)') // amber-400
          ctx.setLineWidth(2.5)
          ctx.stroke()

          // ASC 标记圆点（带光晕）
          ctx.beginPath()
          const ascDotRadius = size * 0.035
          ctx.arc(ascX1, ascY1, ascDotRadius * 1.5, 0, 2 * Math.PI)
          ctx.setFillStyle('rgba(251, 191, 36, 0.3)')
          ctx.fill()

          ctx.beginPath()
          ctx.arc(ascX1, ascY1, ascDotRadius, 0, 2 * Math.PI)
          ctx.setFillStyle('#fbbf24') // amber-400
          ctx.fill()

          // DSC 标记圆点（带光晕）
          ctx.beginPath()
          ctx.arc(ascX2, ascY2, ascDotRadius * 1.5, 0, 2 * Math.PI)
          ctx.setFillStyle('rgba(251, 191, 36, 0.3)')
          ctx.fill()

          ctx.beginPath()
          ctx.arc(ascX2, ascY2, ascDotRadius, 0, 2 * Math.PI)
          ctx.setFillStyle('#fbbf24')
          ctx.fill()

          // 绘制 ASC 标记（金色，带阴影）
          const ascTextX = centerX + Math.cos(ascAngle) * (radiusOuter + size * 0.06)
          const ascTextY = centerY + Math.sin(ascAngle) * (radiusOuter + size * 0.06)
          ctx.setFontSize(size * 0.035)
          ctx.setFillStyle('#e0e7ff')
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')
          ctx.fillText('ASC', ascTextX, ascTextY + 1)
          ctx.setFillStyle('#fbbf24')
          ctx.fillText('ASC', ascTextX, ascTextY)

          // 绘制 DSC 标记（金色）
          const dscTextX = centerX - Math.cos(ascAngle) * (radiusOuter + size * 0.06)
          const dscTextY = centerY - Math.sin(ascAngle) * (radiusOuter + size * 0.06)
          ctx.setFillStyle('#e0e7ff')
          ctx.fillText('DSC', dscTextX, dscTextY + 1)
          ctx.setFillStyle('#fbbf24')
          ctx.fillText('DSC', dscTextX, dscTextY)
        }

        // 绘制中天 (MC) - 青色光晕
        if (chartData && chartData.midheaven) {
          const mcAngle = (chartData.midheaven) * Math.PI / 180
          const mcX1 = centerX + Math.cos(mcAngle) * radiusOuter
          const mcY1 = centerY + Math.sin(mcAngle) * radiusOuter
          const mcX2 = centerX - Math.cos(mcAngle) * radiusOuter
          const mcY2 = centerY - Math.sin(mcAngle) * radiusOuter

          // MC 轴线光晕
          ctx.beginPath()
          ctx.moveTo(mcX1, mcY1)
          ctx.lineTo(mcX2, mcY2)
          ctx.setStrokeStyle('rgba(6, 182, 212, 0.2)') // cyan-500
          ctx.setLineWidth(10)
          ctx.stroke()

          // MC 轴线
          ctx.beginPath()
          ctx.moveTo(mcX1, mcY1)
          ctx.lineTo(mcX2, mcY2)
          ctx.setStrokeStyle('rgba(6, 182, 212, 0.9)') // cyan-500
          ctx.setLineWidth(2.5)
          ctx.stroke()

          // MC 标记圆点（带光晕）
          ctx.beginPath()
          const mcDotRadius = size * 0.035
          ctx.arc(mcX1, mcY1, mcDotRadius * 1.5, 0, 2 * Math.PI)
          ctx.setFillStyle('rgba(6, 182, 212, 0.3)')
          ctx.fill()

          ctx.beginPath()
          ctx.arc(mcX1, mcY1, mcDotRadius, 0, 2 * Math.PI)
          ctx.setFillStyle('#06b6d4') // cyan-500
          ctx.fill()

          // IC 标记圆点（带光晕）
          ctx.beginPath()
          ctx.arc(mcX2, mcY2, mcDotRadius * 1.5, 0, 2 * Math.PI)
          ctx.setFillStyle('rgba(6, 182, 212, 0.3)')
          ctx.fill()

          ctx.beginPath()
          ctx.arc(mcX2, mcY2, mcDotRadius, 0, 2 * Math.PI)
          ctx.setFillStyle('#06b6d4')
          ctx.fill()

          // 绘制 MC 标记（青色，带阴影）
          const mcTextX = centerX + Math.cos(mcAngle) * (radiusOuter + size * 0.06)
          const mcTextY = centerY + Math.sin(mcAngle) * (radiusOuter + size * 0.06)
          ctx.setFontSize(size * 0.035)
          ctx.setFillStyle('#e0e7ff')
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')
          ctx.fillText('MC', mcTextX, mcTextY + 1)
          ctx.setFillStyle('#06b6d4')
          ctx.fillText('MC', mcTextX, mcTextY)

          // 绘制 IC 标记（青色）
          const icTextX = centerX - Math.cos(mcAngle) * (radiusOuter + size * 0.06)
          const icTextY = centerY - Math.sin(mcAngle) * (radiusOuter + size * 0.06)
          ctx.setFillStyle('#e0e7ff')
          ctx.fillText('IC', icTextX, icTextY + 1)
          ctx.setFillStyle('#06b6d4')
          ctx.fillText('IC', icTextX, icTextY)
        }

        // 绘制行星（白色，带光晕和半透明背景）
        if (chartData && chartData.planets) {
          chartData.planets.forEach(planet => {
            const angle = (planet.degree) * Math.PI / 180
            const planetRadius = (radiusInner + radiusCenter) / 2
            const x = centerX + Math.cos(angle) * planetRadius
            const y = centerY + Math.sin(angle) * planetRadius

            // 行星背景光晕（改用简单填充，不支持 createRadialGradient）
            const planetGlowRadius = size * 0.035
            ctx.beginPath()
            ctx.arc(x, y, planetGlowRadius, 0, 2 * Math.PI)
            ctx.setFillStyle('rgba(255, 255, 255, 0.1)')
            ctx.fill()

            // 行星符号
            ctx.setFontSize(size * 0.052)
            ctx.setFillStyle('#ffffff')
            ctx.setTextAlign('center')
            ctx.setTextBaseline('middle')
            ctx.fillText(planet.symbol, x, y)

            // 行星符号外发光（柔和的模糊效果）
            ctx.setFontSize(size * 0.052)
            ctx.setFillStyle('rgba(255, 255, 255, 0.25)')
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                  ctx.fillText(planet.symbol, x + dx, y + dy)
                }
              }
            }
          })
        }

        // ========== 星座符号 ==========
        const zodiacSigns = ['♓', '♒', '♑', '♐', '♏', '♎', '♍', '♌', '♋', '♊', '♉', '♈']
        const zodiacSymbolColors = [
          '#8A2BE2', '#FD79A8', '#2D3436', '#00CEC9',
          '#A29BFE', '#6C5CE7', '#073B4C', '#EF476F',
          '#118AB2', '#06D6A0', '#FFD166', '#FF6B6B'
        ]

        // 星座符号固定排列：从第一象限（右边，0°）开始，逆时针排列（倒序：双鱼→白羊）
        for (let i = 0; i < 12; i++) {
          const signDeg = (i + 1) * 30  // 0°, 30°, 60°, ..., 330°
          const signAngle = signDeg * Math.PI / 180
          const signRadius = radiusOuter + size * 0.045
          const x = centerX + Math.cos(signAngle) * signRadius
          const y = centerY + Math.sin(signAngle) * signRadius

          // 星座符号背景
          ctx.beginPath()
          ctx.arc(x, y, size * 0.022, 0, 2 * Math.PI)
          ctx.setFillStyle('rgba(255, 255, 255, 0.06)')
          ctx.fill()

          // 星座符号
          ctx.setFontSize(size * 0.048)
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')

          // 阴影
          ctx.setFillStyle('rgba(0, 0, 0, 0.4)')
          ctx.fillText(zodiacSigns[i], x + 1, y + 1)

          // 主体（柔和彩色）
          ctx.setFillStyle(zodiacSymbolColors[i])
          ctx.fillText(zodiacSigns[i], x, y)
        }

        // 绘制标题（白色，加粗，加光晕）
        ctx.setFontSize(size * 0.045)
        ctx.setFillStyle('#ffffff')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('top')
        ctx.fillText('', centerX, size * 0.035)

        // 标题光晕效果
        ctx.setFontSize(size * 0.045)
        ctx.setFillStyle('rgba(96, 165, 250, 0.3)')
        ctx.fillText('', centerX, size * 0.035)

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
  },

  // 跳转到输入页面
  goToInput() {
    wx.navigateTo({
      url: '/pages/astrology-input/astrology-input'
    })
  }
})
