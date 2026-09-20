let toastTimer = null

export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast')
  const toastMsg = document.getElementById('toastMsg')
  if (!toast || !toastMsg) return

  if (toastTimer) clearTimeout(toastTimer)
  toastMsg.textContent = message
  toast.classList.remove('hidden')
  requestAnimationFrame(() => toast.classList.add('show'))
  toastTimer = setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.classList.add('hidden'), 300)
  }, duration)
}

export function formatTime(ms) {
  if (ms <= 0) return '已过期'
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} 天`
  if (hours > 0) return `${hours} 小时`
  if (minutes > 0) return `${minutes} 分钟`
  return '不到 1 分钟'
}

export function getUnitLabel(unit) {
  const labels = { day: '天', hour: '小时', minute: '分钟', count: '次' }
  return labels[unit] || unit
}

export function showCopyrightToast(duration = 3000) {
  const toast = document.getElementById('toast')
  const toastMsg = document.getElementById('toastMsg')
  if (!toast || !toastMsg) return

  toastMsg.textContent = ''

  const line1 = document.createElement('span')
  line1.textContent = 'ShareText 开源临时文本分享服务'
  toastMsg.appendChild(line1)

  toastMsg.appendChild(document.createElement('br'))

  const text2 = document.createTextNode('Copyright © 2026 by ')
  const link = document.createElement('a')
  link.href = 'https://github.com/LsleRowan'
  link.target = '_blank'
  link.textContent = 'LsleRowan'
  link.className = 'toast-link'
  toastMsg.appendChild(text2)
  toastMsg.appendChild(link)

  if (toastTimer) clearTimeout(toastTimer)
  toast.classList.remove('hidden')
  requestAnimationFrame(() => toast.classList.add('show'))
  toastTimer = setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.classList.add('hidden'), 300)
  }, duration)
}
