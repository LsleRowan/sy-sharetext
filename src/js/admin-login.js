import { showToast } from './utils.js'

const setupSection = document.getElementById('setupSection')
const loginSection = document.getElementById('loginSection')
const setupForm = document.getElementById('setupForm')
const loginForm = document.getElementById('loginForm')

async function init() {
  try {
    const res = await fetch('/api/admin/check')
    if (res.ok) {
      window.location.href = '/admin'
      return
    }
  } catch {}

  checkSetupStatus()
}

async function checkSetupStatus() {
  try {
    const res = await fetch('/api/admin/setup')
    if (res.ok) {
      const data = await res.json()
      if (data.needsSetup) {
        setupSection.classList.remove('hidden')
        loginSection.classList.add('hidden')
      }
    }
  } catch {}
}

setupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const password = document.getElementById('setupPassword').value
  const confirm = document.getElementById('setupPasswordConfirm').value

  if (password !== confirm) {
    showToast('两次密码不一致')
    return
  }

  try {
    const res = await fetch('/api/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    const data = await res.json()
    if (res.ok) {
      window.location.href = '/admin'
    } else {
      showToast(data.error || '设置失败')
    }
  } catch {
    showToast('网络错误')
  }
})

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const password = document.getElementById('loginPassword').value

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    const data = await res.json()
    if (res.ok) {
      window.location.href = '/admin'
    } else {
      showToast(data.error || '密码错误')
    }
  } catch {
    showToast('网络错误')
  }
})

init()
