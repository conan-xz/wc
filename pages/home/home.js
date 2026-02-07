// pages/home/home.js
const AstrologyCalculator = require('../../utils/astrologyCalculator')
const { asyncDrawStarChart } = require('../../utils/starChartDrawer')

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
    isLoadingChart: false,
    // 核心三星座数据
    sunSign: { name: '未知', symbol: '?' },
    moonSign: { name: '未知', symbol: '?' },
    ascSign: { name: '未知', symbol: '?' },
    // 运势分析数据
    fortuneAnalysis: {
      planets: [],
      houses: [],
      aspects: []
    }
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
        // 如果已经有星盘数据，更新核心三星座并绘制
        const sunSign = this.getSunSign()
        const moonSign = this.getMoonSign()
        const ascSign = this.getAscSign()

        this.setData({
          sunSign,
          moonSign,
          ascSign
        })

        // 生成运势分析
        this.generateFortuneAnalysis(chartData)

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

      // 更新核心三星座
      const sunSign = this.getSunSign()
      const moonSign = this.getMoonSign()
      const ascSign = this.getAscSign()

      this.setData({
        sunSign,
        moonSign,
        ascSign
      })

      // 生成运势分析
      this.generateFortuneAnalysis(chartData)

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
      return { name: '太阳', symbol: '☉' }
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

    return zodiacSigns[signIndex] || { name: '太阳', symbol: '☉' }
  },

  // 新增：获取月亮星座
  getMoonSign() {
    const { chartData } = this.data
    if (!chartData || !chartData.planets) {
      return { name: '月亮', symbol: '☽' }
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

    return zodiacSigns[signIndex] || { name: '月亮', symbol: '☽' }
  },

  // 新增：获取上升星座
  getAscSign() {
    const { chartData } = this.data
    if (!chartData || !chartData.ascendant) {
      return { name: '上升', symbol: '☊' }
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

    return zodiacSigns[signIndex] || { name: '上升', symbol: '☊' }
  },

  // 新增：绘制星盘
  drawStarChart() {
    const { chartData } = this.data
    if (!chartData) return

    asyncDrawStarChart({
      selector: '#starChart',
      chartData,
      pageContext: this
    })
  },

  // 跳转到输入页面
  goToInput() {
    wx.navigateTo({
      url: '/pages/astrology-input/astrology-input'
    })
  },

  // 生成运势分析
  generateFortuneAnalysis(chartData) {
    if (!chartData) return

    // 行星运势分析
    const planetAnalysis = []
    const planetInterpretations = {
      '太阳': {
        symbol: '☉',
        general: '太阳代表自我、生命力和核心身份。当前能量旺盛，适合展现领导力和创造力，是个人成长和实现目标的好时机。'
      },
      '月亮': {
        symbol: '☽',
        general: '月亮影响情绪、直觉和安全感。目前情绪波动较大，需要注意情绪管理和自我关怀，同时直觉敏锐，适合内省和灵性成长。'
      },
      '水星': {
        symbol: '☿',
        general: '水星掌管沟通、思维和学习。思维敏捷，沟通顺畅，是学习新知识、表达想法的有利时期，注意避免信息过载。'
      },
      '金星': {
        symbol: '♀',
        general: '金星关联爱情、美和价值观。感情运佳，人际关系和谐，审美提升，适合约会、社交和艺术创作。'
      },
      '火星': {
        symbol: '♂',
        general: '火星代表行动力、激情和斗志。能量充沛，动力十足，适合开展新项目和挑战，但需注意控制冲动和冲突。'
      },
      '木星': {
        symbol: '♃',
        general: '木星象征幸运、成长和智慧。好运降临，视野开阔，适合探索新机会和扩展知识，慷慨和乐观是关键词。'
      },
      '土星': {
        symbol: '♄',
        general: '土星带来责任、纪律和考验。需要面对现实挑战，培养耐心和毅力，虽然压力较大，但能获得长远的成长。'
      },
      '天王星': {
        symbol: '♅',
        general: '天王星激发创新、变革和自由。突变和意外频发，打破常规，适合突破限制和尝试新事物，保持灵活适应。'
      },
      '海王星': {
        symbol: '♆',
        general: '海王星关联梦想、灵性和迷惑。直觉和灵感增强，但容易产生幻觉和逃避现实，适合艺术创作和灵性修行。'
      },
      '冥王星': {
        symbol: '♇',
        general: '冥王星掌控转化、权力和重生。深层变革发生，旧有模式瓦解，需要面对恐惧和阴影，最终获得重生和力量。'
      },
      '月北交点': {
        symbol: '☊',
        general: '北交点指引灵魂进化方向。当前是学习新技能、拓展人际关系的好时机，向目标前进会带来成长和满足。'
      },
      '月南交点': {
        symbol: '☋',
        general: '南交点代表天赋和需要放下的模式。需警惕依赖旧有习惯，学会释放过去的包袱，才能更好地面向未来。'
      }
    }

    if (chartData.planets) {
      chartData.planets.forEach(planet => {
        const interpretation = planetInterpretations[planet.name] || planetInterpretations[planet.englishName]
        if (interpretation) {
          planetAnalysis.push({
            name: planet.name,
            symbol: planet.symbol || interpretation.symbol,
            analysis: interpretation.general
          })
        }
      })
    }

    // 宫位运势分析
    const houseAnalysis = []
    const houseInterpretations = [
      { number: '①', name: '自我宫', analysis: '1宫关乎自我形象和个人起点。目前是重新认识自己、建立自信的好时期，适合开始新项目和个人发展。' },
      { number: '②', name: '财富宫', analysis: '2宫掌管金钱和价值观。财务状况稳定，适合理财规划和投资，同时反思个人价值观和物质需求。' },
      { number: '③', name: '交流宫', analysis: '3宫关联沟通和学习。思维活跃，学习能力强，适合进修、写作和短途旅行，兄弟姐妹关系融洽。' },
      { number: '④', name: '家庭宫', analysis: '4宫代表家庭和根源。家庭生活和谐，适合处理房产事务和改善家居环境，内心寻求安全感。' },
      { number: '⑤', name: '创造力宫', analysis: '5宫掌管创造和爱情。创意迸发，感情甜蜜，适合艺术创作、约会和娱乐活动，子女关系良好。' },
      { number: '⑥', name: '健康宫', analysis: '6宫关联健康和工作。需要注意身体保养和工作压力管理，适合调整作息和改善工作流程。' },
      { number: '⑦', name: '伴侣宫', analysis: '7宫代表婚姻和合作关系。人际关系重要，适合签订合约和深化伙伴关系，寻找平衡和妥协。' },
      { number: '⑧', name: '转变宫', analysis: '8宫掌控深度和转化。面对深层议题和转变，适合心理探索和处理共同财产，获得重生力量。' },
      { number: '⑨', name: '哲学宫', analysis: '9宫关联智慧和远行。视野开阔，追求真理，适合高等教育、长途旅行和哲学思考，拓展世界观。' },
      { number: '⑩', name: '事业宫', analysis: '10宫掌管事业和社会地位。职业发展关键期，适合追求事业目标和提升社会影响力，获得认可和成就。' },
      { number: '⑪', name: '社交宫', analysis: '11宫代表友谊和理想。社交活跃，适合加入团体和实现长期目标，与志同道合的人建立联系。' },
      { number: '⑫', name: '灵性宫', analysis: '12宫关联潜意识和灵性。需要独处和内省，适合冥想和精神修行，处理未完成的议题，获得内心平静。' }
    ]

    if (chartData.houses && chartData.houses.length >= 12) {
      houseInterpretations.forEach(house => {
        houseAnalysis.push(house)
      })
    }

    // 相位运势分析
    const aspectAnalysis = []
    const aspectSymbols = {
      'conjunction': '☌',
      'opposition': '☍',
      'trine': '△',
      'square': '□',
      'sextile': '⚹',
      'quincunx': '⚻',
      'semi-sextile': '⚺',
      'sesquiquadrate': '⚼'
    }
    const aspectInterpretations = {
      'conjunction': {
        symbol: '☌',
        general: '合相带来能量融合，两个行星的力量相互增强，是集中能量实现目标的好时机。'
      },
      'opposition': {
        symbol: '☍',
        general: '对冲产生对立和张力，需要在两个极端间寻找平衡，通过合作和妥协化解冲突。'
      },
      'trine': {
        symbol: '△',
        general: '三分相代表和谐与天赋，能量流畅自然，是发挥优势和享受好运的理想时期。'
      },
      'square': {
        symbol: '□',
        general: '四分相带来挑战和压力，需要克服障碍和突破限制，虽然困难但能促进成长。'
      },
      'sextile': {
        symbol: '⚹',
        general: '六分相创造机会和可能性，两个行星相互支持，适合学习新技能和把握机遇。'
      }
    }

    if (chartData.aspects && chartData.aspects.length > 0) {
      // 取前5个重要相位
      const importantAspects = chartData.aspects.slice(0, 5)
      importantAspects.forEach(aspect => {
        const interpretation = aspectInterpretations[aspect.name]
        if (interpretation) {
          aspectAnalysis.push({
            planet1: aspect.planet1,
            planet2: aspect.planet2,
            symbol: interpretation.symbol,
            analysis: interpretation.general
          })
        }
      })
    }

    // 设置运势分析数据
    this.setData({
      fortuneAnalysis: {
        planets: planetAnalysis,
        houses: houseAnalysis,
        aspects: aspectAnalysis
      }
    })
  }
})
