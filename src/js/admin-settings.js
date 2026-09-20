import { showToast } from './utils.js'

const loadingState = document.getElementById('loadingState')
const cardArea = document.getElementById('cardArea')
const settingsPanel = document.getElementById('settingsPanel')
const backBtn = document.getElementById('backBtn')
const sitePasswordToggle = document.getElementById('sitePasswordToggle')
const sitePasswordInput = document.getElementById('sitePasswordInput')
const newSitePassword = document.getElementById('newSitePassword')
const saveSitePasswordBtn = document.getElementById('saveSitePasswordBtn')
const oldAdminPassword = document.getElementById('oldAdminPassword')
const newAdminPassword = document.getElementById('newAdminPassword')
const changeAdminPasswordBtn = document.getElementById('changeAdminPasswordBtn')

async function init() {
  try {
    const res = await fetch('/api/admin/check')
    if (!res.ok) {
      window.location.href = '/admin/login'
      return
    }
  } catch {
    window.location.href = '/admin/login'
    return
  }

  settingsPanel.classList.remove('hidden')
  loadingState.classList.add('hidden')
  cardArea.classList.remove('hidden')
  loadSettings()
}

backBtn.addEventListener('click', () => {
  window.location.href = '/admin'
})

async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      sitePasswordToggle.checked = data.sitePassword
      sitePasswordInput.classList.toggle('visible', data.sitePassword)
      if (data.sitePassword) {
        newSitePassword.value = ''
      }
    }
  } catch {}
}

sitePasswordToggle.addEventListener('change', async () => {
  const enabled = sitePasswordToggle.checked
  if (enabled) {
    sitePasswordInput.classList.add('visible')
  } else {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitePassword: false })
      })
      if (res.ok) {
        sitePasswordInput.classList.remove('visible')
        showToast('站点密码已关闭')
      }
    } catch {
      sitePasswordToggle.checked = false
      showToast('操作失败')
    }
  }
})

saveSitePasswordBtn.addEventListener('click', async () => {
  const password = newSitePassword.value
  if (!password || password.length < 6) {
    showToast('密码至少需要 6 个字符')
    return
  }

  saveSitePasswordBtn.disabled = true
  saveSitePasswordBtn.textContent = '保存中...'

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sitePassword: true, password })
    })
    if (res.ok) {
      showToast('站点密码已保存')
      newSitePassword.value = ''
    } else {
      const data = await res.json()
      showToast(data.error || '保存失败')
    }
  } catch {
    showToast('网络错误')
  } finally {
    saveSitePasswordBtn.disabled = false
    saveSitePasswordBtn.textContent = '保存'
  }
})

changeAdminPasswordBtn.addEventListener('click', async () => {
  const oldPwd = oldAdminPassword.value
  const newPwd = newAdminPassword.value
  if (!oldPwd || !newPwd) {
    showToast('请输入原密码和新密码')
    return
  }
  if (newPwd.length < 6) {
    showToast('新密码至少需要 6 个字符')
    return
  }

  changeAdminPasswordBtn.disabled = true
  changeAdminPasswordBtn.textContent = '修改中...'

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    })
    const data = await res.json()
    if (res.ok) {
      showToast('密码已修改，站点密码用户已被踢出')
      oldAdminPassword.value = ''
      newAdminPassword.value = ''
    } else {
      showToast(data.error || '修改失败')
    }
  } catch {
    showToast('网络错误')
  } finally {
    changeAdminPasswordBtn.disabled = false
    changeAdminPasswordBtn.textContent = '修改密码'
  }
})

init()
