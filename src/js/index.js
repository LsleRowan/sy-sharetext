import { showToast, formatTime, showCopyrightToast } from './utils.js'

const fetchForm = document.getElementById('fetchForm')
const idInput = document.getElementById('idInput')
const fetchBtn = document.getElementById('fetchBtn')
const resultModal = document.getElementById('resultModal')
const closeModal = document.getElementById('closeModal')
const resultContent = document.getElementById('resultContent')
const resultIdTag = document.getElementById('resultIdTag')
const resultExpiryTag = document.getElementById('resultExpiryTag')
const copyTextBtn = document.getElementById('copyTextBtn')

let currentText = ''

async function fetchText(id) {
  fetchBtn.disabled = true
  fetchBtn.textContent = '获取中...'

  try {
    const res = await fetch(`/api/text/${encodeURIComponent(id)}`)
    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || '获取失败')
      return
    }

    showSuccess(data)
  } catch {
    showToast('网络错误，请重试')
  } finally {
    fetchBtn.disabled = false
    fetchBtn.textContent = '获取文本'
  }
}

function showSuccess(data) {
  currentText = data.content

  const expiry = data.expiryType === 'count'
    ? `${Math.max(0, data.maxViews - data.currentViews)} 次`
    : formatTime(data.expiresAt - Date.now())

  resultContent.textContent = data.content
  resultIdTag.textContent = data.id
  resultExpiryTag.textContent = `剩余 ${expiry}`

  resultModal.classList.remove('hidden')
}

function closeModalFn() {
  resultModal.classList.add('hidden')
}

copyTextBtn.addEventListener('click', async () => {
  if (!currentText) return
  try {
    await navigator.clipboard.writeText(currentText)
    copyTextBtn.textContent = '已复制'
    setTimeout(() => { copyTextBtn.textContent = '复制文本' }, 2000)
  } catch {
    const range = document.createRange()
    range.selectNode(resultContent)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    document.execCommand('copy')
    window.getSelection().removeAllRanges()
    copyTextBtn.textContent = '已复制'
    setTimeout(() => { copyTextBtn.textContent = '复制文本' }, 2000)
  }
})

closeModal.addEventListener('click', closeModalFn)
resultModal.addEventListener('click', (e) => {
  if (e.target === resultModal) closeModalFn()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !resultModal.classList.contains('hidden')) {
    closeModalFn()
  }
})

fetchForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const id = idInput.value.trim()
  if (id) fetchText(id)
})

const urlParams = new URLSearchParams(window.location.search)
const prefillId = urlParams.get('id')
if (prefillId) {
  idInput.value = prefillId
  fetchText(prefillId)
}

if (!localStorage.getItem('sharetext_copyright_seen')) {
  showCopyrightToast()
  localStorage.setItem('sharetext_copyright_seen', '1')
}
