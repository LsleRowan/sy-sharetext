import QRCode from 'qrcode'
import { showToast, getUnitLabel } from './utils.js'
import { generateKey, encrypt, exportKey } from './crypto.js'

const sitePasswordModal = document.getElementById('sitePasswordModal')
const sitePasswordForm = document.getElementById('sitePasswordForm')
const sitePasswordInput = document.getElementById('sitePasswordInput')
const createForm = document.getElementById('createForm')
const contentInput = document.getElementById('contentInput')
const expiryValue = document.getElementById('expiryValue')
const expiryUnit = document.getElementById('expiryUnit')
const createBtn = document.getElementById('createBtn')
const modeSwitch = document.getElementById('modeSwitch')
const modeDesc = document.getElementById('modeDesc')
const successModal = document.getElementById('successModal')
const closeModal = document.getElementById('closeModal')
const successValue = document.getElementById('successValue')
const successExpiry = document.getElementById('successExpiry')
const successMode = document.getElementById('successMode')
const successCopyBtn = document.getElementById('successCopyBtn')

let currentMode = 'id'
let currentCopyText = ''

const modeDescriptions = {
  id: '生成 5 位数字 ID，方便在其他设备输入',
  link: '生成专属链接，打开即可查看',
  'link-encrypted': '生成端对端加密链接，持有完整链接才可查看'
}

async function init() {
  try {
    const res = await fetch('/api/settings')
    const data = await res.json()
    if (!data.sitePassword || data.verified) return
    sitePasswordModal.classList.remove('hidden')
  } catch {}
}

sitePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const password = sitePasswordInput.value
  if (!password) return

  const btn = sitePasswordForm.querySelector('button[type="submit"]')
  btn.disabled = true
  btn.textContent = '验证中...'

  try {
    const res = await fetch('/api/verify-site-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (res.ok) {
      sitePasswordModal.classList.add('hidden')
      sitePasswordInput.value = ''
    } else {
      const data = await res.json()
      showToast(data.error || '密码错误')
    }
  } catch {
    showToast('网络错误')
  } finally {
    btn.disabled = false
    btn.textContent = '验证'
  }
})

modeSwitch.addEventListener('click', (e) => {
  const segment = e.target.closest('.segment')
  if (!segment || segment.classList.contains('segment-active')) return

  const mode = segment.dataset.mode
  currentMode = mode

  modeSwitch.querySelectorAll('.segment').forEach(s => s.classList.remove('segment-active'))
  segment.classList.add('segment-active')
  modeDesc.textContent = modeDescriptions[mode]
})

async function createText() {
  const content = contentInput.value.trim()
  if (!content) return

  createBtn.disabled = true
  createBtn.textContent = '创建中...'

  try {
    const payload = {
      content,
      expiryValue: parseInt(expiryValue.value) || 1,
      expiryUnit: expiryUnit.value,
      mode: currentMode === 'link-encrypted' ? 'link' : currentMode
    }

    let keyStr = null

    if (currentMode === 'link-encrypted') {
      const key = await generateKey()
      const ciphertext = await encrypt(content, key)
      payload.content = ciphertext
      payload.encrypted = true
      keyStr = await exportKey(key)
    }

    const res = await fetch('/api/text/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || '创建失败')
      return
    }

    const expiryLabel = expiryUnit.value === 'count'
      ? `剩余 ${expiryValue.value} 次`
      : `剩余 ${expiryValue.value} ${getUnitLabel(expiryUnit.value)}`

    if (currentMode === 'id') {
      showIdSuccess(data.id, expiryLabel)
    } else if (currentMode === 'link-encrypted') {
      showLinkSuccess(data.token, expiryLabel, true, keyStr)
    } else {
      showLinkSuccess(data.token, expiryLabel, false)
    }
  } catch {
    showToast('网络错误，请重试')
  } finally {
    createBtn.disabled = false
    createBtn.textContent = '创建文本'
  }
}

function clearSuccessValue() {
  while (successValue.firstChild) {
    successValue.removeChild(successValue.firstChild)
  }
}

function showIdSuccess(id, expiryLabel) {
  currentCopyText = id
  successExpiry.textContent = expiryLabel
  successMode.classList.add('hidden')

  clearSuccessValue()
  const idDiv = document.createElement('div')
  idDiv.className = 'success-id'
  idDiv.textContent = id
  successValue.appendChild(idDiv)

  const qrDiv = document.createElement('div')
  qrDiv.className = 'success-qr'
  const hintDiv = document.createElement('div')
  hintDiv.className = 'success-qr-hint'
  hintDiv.textContent = '扫描二维码快速查看'
  QRCode.toCanvas(`${window.location.origin}/?id=${id}`, { width: 160, margin: 2 }, (err, canvas) => {
    if (!err) {
      qrDiv.appendChild(canvas)
      qrDiv.appendChild(hintDiv)
    }
  })
  successValue.appendChild(qrDiv)
  successCopyBtn.textContent = '复制 ID'
  successModal.classList.remove('hidden')
}

function showLinkSuccess(token, expiryLabel, encrypted = false, keyStr = '') {
  const link = encrypted
    ? `${window.location.origin}/t/${token}#${keyStr}`
    : `${window.location.origin}/t/${token}`
  currentCopyText = link
  successExpiry.textContent = expiryLabel

  if (encrypted) {
    successMode.textContent = '端对端加密'
    successMode.classList.remove('hidden')
  } else {
    successMode.textContent = '普通链接'
    successMode.classList.remove('hidden')
  }

  clearSuccessValue()
  const linkEl = document.createElement('a')
  linkEl.className = 'success-link'
  linkEl.href = link
  linkEl.target = '_blank'
  linkEl.textContent = link
  successValue.appendChild(linkEl)

  const qrDiv = document.createElement('div')
  qrDiv.className = 'success-qr'
  const hintDiv = document.createElement('div')
  hintDiv.className = 'success-qr-hint'
  hintDiv.textContent = encrypted ? '扫码即可安全查看' : '扫码即可查看文本'
  QRCode.toCanvas(link, { width: 160, margin: 2 }, (err, canvas) => {
    if (!err) {
      qrDiv.appendChild(canvas)
      qrDiv.appendChild(hintDiv)
    }
  })
  successValue.appendChild(qrDiv)
  successCopyBtn.textContent = '复制链接'
  successModal.classList.remove('hidden')
}

function closeModalFn() {
  successModal.classList.add('hidden')
}

successCopyBtn.addEventListener('click', async () => {
  if (!currentCopyText) return
  try {
    await navigator.clipboard.writeText(currentCopyText)
    successCopyBtn.textContent = '已复制'
    setTimeout(() => {
      successCopyBtn.textContent = currentMode === 'id' ? '复制 ID' : '复制链接'
    }, 2000)
  } catch {
    const input = document.createElement('input')
    input.value = currentCopyText
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    successCopyBtn.textContent = '已复制'
    setTimeout(() => {
      successCopyBtn.textContent = currentMode === 'id' ? '复制 ID' : '复制链接'
    }, 2000)
  }
})

closeModal.addEventListener('click', closeModalFn)

createForm.addEventListener('submit', (e) => {
  e.preventDefault()
  createText()
})

init()
