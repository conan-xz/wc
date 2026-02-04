// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'prod-5gg03znv016787f1',
        traceUser: true
      })
      console.log('云开发已初始化')
    } else {
      console.error('当前基础库版本过低，无法使用云开发能力')
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用云开发能力，请升级到最新版本后重试',
        showCancel: false
      })
    }
  }
})
