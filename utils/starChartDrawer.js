/**
 * 星盘绘制工具
 * 用于在小程序 canvas 中绘制占星星盘
 */

const { ZODIAC_SIGNS } = require('./constants.js')

/**
 * 绘制星盘
 */
export function drawStarChart(options) {
  const {
    canvasContext: ctx,
    canvasSize,
    chartData,
    backgroundColor
  } = options

  if (!ctx || !canvasSize || !chartData) {
    console.error('星盘绘制参数缺失')
    return
  }

  const { width, height } = canvasSize
  const size = Math.min(width, height)
  const centerX = size / 2
  const centerY = size / 2 * 1.1
  const radiusOuter = size * 0.38
  const radiusInner = size * 0.28
  const radiusCenter = size * 0.18
  const houseRadius = size * 0.33

  // 绘制星空背景
  _drawBackground(ctx, size, centerX, centerY, radiusOuter, backgroundColor)

  // 绘制星座扇形背景（固定从 0° 开始，逆时针排列）
  _drawZodiacBackground(ctx, centerX, centerY, radiusOuter, size)

  // 绘制外圆 - 星座圈
  _drawOuterCircle(ctx, centerX, centerY, radiusOuter, size)

  // 绘制内圆 - 宫位圈
  _drawInnerCircle(ctx, centerX, centerY, radiusInner)

  // 绘制中心圆
  _drawCenterCircle(ctx, centerX, centerY, radiusCenter)

  // 绘制四轴线（ASC, MC, DSC, IC）
  _drawAscAxis(ctx, chartData, centerX, centerY, radiusOuter, size)
  _drawMcAxis(ctx, chartData, centerX, centerY, radiusOuter, size)

  // 绘制宫位线
  _drawHouses(ctx, chartData, centerX, centerY, radiusOuter, radiusCenter, houseRadius, size)

  // 绘制行星
  _drawPlanets(ctx, chartData, centerX, centerY, radiusInner, radiusCenter, size)

  // 绘制星座符号
  _drawZodiacSigns(ctx, centerX, centerY, radiusOuter, size)

  // 添加星辰点缀
  _drawStars(ctx, centerX, centerY, radiusInner, radiusCenter, size)

  ctx.draw()
}

/**
 * 在页面中异步绘制星盘
 * @param {Object} options - 绘制选项
 * @param {string} options.selector - Canvas 选择器
 * @param {Object} options.chartData - 星盘数据
 * @param {Page} options.pageContext - Page 实例
 * @param {string} [options.backgroundColor] - 背景颜色
 * @param {function} [options.callback] - 绘制完成回调
 * @returns {Promise<void>}
 */
export function asyncDrawStarChart(options) {
  return new Promise((resolve) => {
    const { selector, chartData, pageContext, backgroundColor, callback } = options

    const query = wx.createSelectorQuery().in(pageContext)
    query.select(selector).boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        const width = res[0].width
        const height = res[0].height
        const ctx = wx.createCanvasContext(selector.replace('#', ''), pageContext)

        drawStarChart({
          canvasContext: ctx,
          canvasSize: { width, height },
          chartData,
          backgroundColor
        })

        if (callback) {
          callback()
        }
        resolve()
      } else {
        console.error('未找到 Canvas 元素')
        resolve()
      }
    })
  })
}

// ============ 辅助绘制函数 ============

/**
 * 绘制背景
 */
function _drawBackground(ctx, size, centerX, centerY, radiusOuter, backgroundColor) {
  if (!backgroundColor) {
    // 深邃星云渐变
    const nebulaGradient = ctx.createLinearGradient(0, 0, size, size)
    nebulaGradient.addColorStop(0, 'rgba(30, 58, 138, 0.15)')
    nebulaGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)')
    nebulaGradient.addColorStop(1, 'rgba(79, 70, 229, 0.12)')
    ctx.setFillStyle(nebulaGradient)
    ctx.fillRect(0, 0, size, size)

    // 添加星辰点缀
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
  } else {
    ctx.setFillStyle(backgroundColor)
    ctx.fillRect(0, 0, size, size)
  }
}

/**
 * 绘制星座扇形背景
 */
function _drawZodiacBackground(ctx, centerX, centerY, radiusOuter, size) {
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
}

/**
 * 绘制外圆
 */
function _drawOuterCircle(ctx, centerX, centerY, radiusOuter, size) {
  ctx.beginPath()
  ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI)
  ctx.setStrokeStyle('rgba(96, 165, 250, 0.7)')
  ctx.setLineWidth(2)
  ctx.stroke()

  // 外圆光晕效果
  ctx.beginPath()
  ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI)
  ctx.setStrokeStyle('rgba(96, 165, 250, 0.2)')
  ctx.setLineWidth(8)
  ctx.stroke()
}

/**
 * 绘制内圆
 */
function _drawInnerCircle(ctx, centerX, centerY, radiusInner) {
  ctx.beginPath()
  ctx.arc(centerX, centerY, radiusInner, 0, 2 * Math.PI)
  ctx.setStrokeStyle('rgba(79, 70, 229, 0.6)')
  ctx.setLineWidth(1.5)
  ctx.stroke()
}

/**
 * 绘制中心圆
 */
function _drawCenterCircle(ctx, centerX, centerY, radiusCenter) {
  ctx.beginPath()
  ctx.arc(centerX, centerY, radiusCenter, 0, 2 * Math.PI)
  ctx.setStrokeStyle('rgba(59, 130, 246, 0.8)')
  ctx.setLineWidth(2)
  ctx.stroke()

  // 中心圆填充 - 柔和光晕
  ctx.setFillStyle('rgba(59, 130, 246, 0.08)')
  ctx.fill()
}

/**
 * 绘制 ASC 轴
 */
function _drawAscAxis(ctx, chartData, centerX, centerY, radiusOuter, size) {
  if (!chartData.ascendant) return

  const ascAngle = chartData.ascendant * Math.PI / 180
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

  // ASC 轴线光晕
  ctx.beginPath()
  ctx.moveTo(ascX1, ascY1)
  ctx.lineTo(ascX2, ascY2)
  ctx.setStrokeStyle('rgba(251, 191, 36, 0.2)')
  ctx.setLineWidth(10)
  ctx.stroke()

  // ASC/DSC 标记
  _drawAxisMarkers(ctx, ascX1, ascY1, ascX2, ascY2, centerX, centerY, radiusOuter, size, '#fbbf24', 'ASC', 'DSC')
}

/**
 * 绘制 MC 轴
 */
function _drawMcAxis(ctx, chartData, centerX, centerY, radiusOuter, size) {
  if (!chartData.midheaven) return

  const mcAngle = chartData.midheaven * Math.PI / 180
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

  // MC 轴线光晕
  ctx.beginPath()
  ctx.moveTo(mcX1, mcY1)
  ctx.lineTo(mcX2, mcY2)
  ctx.setStrokeStyle('rgba(6, 182, 212, 0.2)')
  ctx.setLineWidth(10)
  ctx.stroke()

  // MC/IC 标记
  _drawAxisMarkers(ctx, mcX1, mcY1, mcX2, mcY2, centerX, centerY, radiusOuter, size, '#06b6d4', 'MC', 'IC')
}

/**
 * 绘制轴线标记
 */
function _drawAxisMarkers(ctx, x1, y1, x2, y2, centerX, centerY, radiusOuter, size, color, text1, text2) {
  const dotRadius = size * 0.015

  // 标记圆点 (两端)
  for (const point of [{x: x1, y: y1}, {x: x2, y: y2}]) {
    ctx.beginPath()
    ctx.arc(point.x, point.y, dotRadius * 1.5, 0, 2 * Math.PI)
    ctx.setFillStyle(`rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.3)`)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(point.x, point.y, dotRadius, 0, 2 * Math.PI)
    ctx.setFillStyle(color)
    ctx.fill()
  }

  // 文字标记
  const textX1 = x1 + (x1 - x2 > 0 ? size * 0.13 : -size * 0.13) * Math.sign(x1 - centerX)
  const textY1 = y1 + (y1 - y2 > 0 ? size * 0.13 : -size * 0.13) * Math.sign(y1 - centerY)
  const textX2 = x2 + (x2 - x1 > 0 ? size * 0.13 : -size * 0.13) * Math.sign(x2 - centerX)
  const textY2 = y2 + (y2 - y1 > 0 ? size * 0.13 : -size * 0.13) * Math.sign(y2 - centerY)

  ctx.setFontSize(size * 0.032)
  ctx.setFillStyle('#e0e7ff')
  ctx.setTextAlign('center')
  ctx.setTextBaseline('middle')
  ctx.fillText(text1, textX1, textY1 + 1)
  ctx.setFillStyle(color)
  ctx.fillText(text1, textX1, textY1)
  ctx.setFillStyle('#e0e7ff')
  ctx.fillText(text2, textX2, textY2 + 1)
  ctx.setFillStyle(color)
  ctx.fillText(text2, textX2, textY2)
}

/**
 * 绘制宫位线
 */
function _drawHouses(ctx, chartData, centerX, centerY, radiusOuter, radiusCenter, houseRadius, size) {
  if (!chartData.houses || chartData.houses.length < 12) return

  for (let i = 0; i < 12; i++) {
    const houseIndex = (12 - i) % 12
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

    // 宫位数字
    const nextIndex = (houseIndex + 11) % 12
    const nextAngle = chartData.houses[nextIndex] * Math.PI / 180

    let midAngle = Math.abs(nextAngle - angle) < Math.PI
      ? (angle + nextAngle) / 2
      : ((angle + nextAngle + 2 * Math.PI) / 2) % (2 * Math.PI)

    const textX = centerX + Math.cos(midAngle) * houseRadius
    const textY = centerY + Math.sin(midAngle) * houseRadius

    ctx.setFontSize(size * 0.042)
    ctx.setFillStyle('#e0e7ff')
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(`${i + 1}`, textX, textY + 1)
    ctx.setFillStyle('#93c5fd')
    ctx.fillText(`${i + 1}`, textX, textY)
  }
}

/**
 * 绘制行星和相位
 */
function _drawPlanets(ctx, chartData, centerX, centerY, radiusInner, radiusCenter, size) {
  if (!chartData.planets) return

  const planetRadius = (radiusInner + radiusCenter) / 2

  chartData.planets.forEach(planet => {
    const angle = planet.degree * Math.PI / 180
    const x = centerX + Math.cos(angle) * planetRadius
    const y = centerY + Math.sin(angle) * planetRadius

    // 行星背景光晕
    const planetGlowRadius = size * 0.045
    ctx.beginPath()
    ctx.arc(x, y, planetGlowRadius, 0, 2 * Math.PI)
    ctx.setFillStyle('rgba(255, 255, 255, 0.1)')
    ctx.fill()

    // 行星符号外发光
    ctx.setFontSize(size * 0.052)
    ctx.setFillStyle('rgba(255, 255, 255, 0.25)')
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx !== 0 || dy !== 0) {
          ctx.fillText(planet.symbol, x + dx, y + dy)
        }
      }
    }

    // 行星符号
    ctx.setFontSize(size * 0.065)
    ctx.setFillStyle('#ffffff')
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(planet.symbol, x, y)
  })

  // 绘制相位线
  _drawAspects(ctx, chartData, centerX, centerY, planetRadius)
}

/**
 * 绘制相位线
 */
function _drawAspects(ctx, chartData, centerX, centerY, radius) {
  if (!chartData.aspects || !chartData.planets) return

  const aspectStyles = {
    'conjunction': { color: '#fbbf24', lineWidth: 2.5, opacity: 0.8 },
    'opposition': { color: '#06b6d4', lineWidth: 2, opacity: 0.7 },
    'trine': { color: '#10b981', lineWidth: 2, opacity: 0.7 },
    'square': { color: '#ef4444', lineWidth: 2, opacity: 0.7 },
    'sextile': { color: '#3b82f6', lineWidth: 1.5, opacity: 0.6 },
    'default': { color: '#6b7280', lineWidth: 1, opacity: 0.5 }
  }

  chartData.aspects.forEach(aspect => {
    const planet1 = _findPlanet(chartData.planets, aspect.planet1)
    const planet2 = _findPlanet(chartData.planets, aspect.planet2)

    if (!planet1 || !planet2) return

    const angle1 = planet1.degree * Math.PI / 180
    const angle2 = planet2.degree * Math.PI / 180
    const x1 = centerX + Math.cos(angle1) * radius
    const y1 = centerY + Math.sin(angle1) * radius
    const x2 = centerX + Math.cos(angle2) * radius
    const y2 = centerY + Math.sin(angle2) * radius

    const style = aspectStyles[aspect.name] || aspectStyles.default

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.setStrokeStyle(_rgbaFromHex(style.color, style.opacity))
    ctx.setLineWidth(style.lineWidth)
    ctx.setLineCap('round')
    ctx.stroke()
  })
}

/**
 * 查找行星
 */
function _findPlanet(planets, name) {
  return planets.find(p =>
    p.englishName === name || p.name === name
  )
}

/**
 * 从十六进制颜色生成 RGBA
 */
function _rgbaFromHex(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * 绘制星座符号
 */
function _drawZodiacSigns(ctx, centerX, centerY, radiusOuter, size) {
  const zodiacSigns = ['♓', '♒', '♑', '♐', '♏', '♎', '♍', '♌', '♋', '♊', '♉', '♈']
  const zodiacSymbolColors = [
    '#8A2BE2', '#FD79A8', '#2D3436', '#00CEC9',
    '#A29BFE', '#6C5CE7', '#073B4C', '#EF476F',
    '#118AB2', '#06D6A0', '#FFD166', '#FF6B6B'
  ]

  for (let i = 0; i < 12; i++) {
    const signDeg = (i + 1) * 30
    const signAngle = signDeg * Math.PI / 180
    const signRadius = radiusOuter + size * 0.08
    const x = centerX + Math.cos(signAngle) * signRadius
    const y = centerY + Math.sin(signAngle) * signRadius

    // 星座符号背景
    ctx.beginPath()
    ctx.arc(x, y, size * 0.03, 0, 2 * Math.PI)
    ctx.setFillStyle('rgba(255, 255, 255, 0.06)')
    ctx.fill()

    // 星座符号阴影
    ctx.setFontSize(size * 0.065)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.setFillStyle('rgba(0, 0, 0, 0.4)')
    ctx.fillText(zodiacSigns[i], x + 1, y + 1)

    // 星座符号
    ctx.setFillStyle(zodiacSymbolColors[i])
    ctx.fillText(zodiacSigns[i], x, y)
  }
}

/**
 * 绘制星辰点缀
 */
function _drawStars(ctx, centerX, centerY, radiusInner, radiusCenter, size) {
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
}

