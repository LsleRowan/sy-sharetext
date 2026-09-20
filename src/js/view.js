import { showToast, formatTime } from './utils.js'
import { importKey, decrypt } from './crypto.js'

const loadingState = document.getElementById('loadingState')
const cardArea = document.getElementById('cardArea')
const emptyState = document.getElementById('emptyState')
const notFoundState = document.getElementById('notFoundState')
const expiredState = document.getElementById('expiredState')
const lockedState = document.getElementById('lockedState')
const decryptErrorState = document.getElementById('decryptErrorState')
const contentArea = document.getElementById('contentArea')
const textContent = document.getElementById('textContent')
const textExpiry = document.getElementById('textExpiry')
const copyBtn = document.getElementById('copyBtn')

let currentText = ''

const token = window.location.pathname.split('/')[2]

async function load() {
  if (!token) {
    loadingState.classList.add('hidden')
    cardArea.classList.remove('hidden')
    emptyState.classList.remove('hidden')
    return
  }

  try {
    const res = await fetch(`/api/t/${encodeURIComponent(token)}`)
    const data = await res.json()

    if (!res.ok) {
      loadingState.classList.add('hidden')
      cardArea.classList.remove('hidden')
      if (res.status === 410) {
        expiredState.classList.remove('hidden')
      } else {
        notFoundState.classList.remove('hidden')
      }
      return
    }

    if (data.encrypted) {
      const hash = location.hash.slice(1)
      if (!hash) {
        loadingState.classList.add('hidden')
        cardArea.classList.remove('hidden')
        lockedState.classList.remove('hidden')
        return
      }

      try {
        const key = await importKey(hash)
        const plaintext = await decrypt(data.content, key)
        currentText = plaintext
        textContent.textContent = plaintext
      } catch {
        loadingState.classList.add('hidden')
        cardArea.classList.remove('hidden')
        decryptErrorState.classList.remove('hidden')
        return
      }
    } else {
      currentText = data.content
      textContent.textContent = data.content
    }

    textExpiry.textContent = data.expiry

    loadingState.classList.add('hidden')
    cardArea.classList.remove('hidden')
    contentArea.classList.remove('hidden')
  } catch {
    loadingState.classList.add('hidden')
    cardArea.classList.remove('hidden')
    notFoundState.classList.remove('hidden')
  }
}

copyBtn.addEventListener('click', async () => {
  if (!currentText) return
  try {
    await navigator.clipboard.writeText(currentText)
    copyBtn.textContent = '已复制'
    setTimeout(() => { copyBtn.textContent = '复制文本' }, 2000)
  } catch {
    const range = document.createRange()
    range.selectNode(textContent)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    document.execCommand('copy')
    window.getSelection().removeAllRanges()
    copyBtn.textContent = '已复制'
    setTimeout(() => { copyBtn.textContent = '复制文本' }, 2000)
  }
})

load()
