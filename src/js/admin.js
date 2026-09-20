import { showToast, getUnitLabel } from './utils.js'

const loadingState = document.getElementById('loadingState')
const cardArea = document.getElementById('cardArea')
const adminPanel = document.getElementById('adminPanel')
const searchInput = document.getElementById('searchInput')
const refreshBtn = document.getElementById('refreshBtn')
const logoutBtn = document.getElementById('logoutBtn')
const textList = document.getElementById('textList')
const detailModal = document.getElementById('detailModal')
const detailContent = document.getElementById('detailContent')
const closeModalBtn = document.getElementById('closeModal')
const copyTextBtn = document.getElementById('copyTextBtn')
const deleteTextBtn = document.getElementById('deleteTextBtn')
const pageInfo = document.getElementById('pageInfo')
const prevPageBtn = document.getElementById('prevPageBtn')
const nextPageBtn = document.getElementById('nextPageBtn')
const settingsBtn = document.getElementById('settingsBtn')

let currentText = null
let currentPage = 1
let currentSearch = ''

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

  showAdminPanel()
  loadingState.classList.add('hidden')
  cardArea.classList.remove('hidden')
  loadTexts()
}

function showAdminPanel() {
  adminPanel.classList.remove('hidden')
}

async function loadTexts(search = '', page = 1) {
  currentSearch = search
  currentPage = page
  try {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('pageSize', 20)
    const url = `/api/admin/list?${params}`
    const res = await fetch(url)

    if (res.status === 401) {
      window.location.href = '/admin/login'
      return
    }

    const data = await res.json()
    renderTextList(data.texts || [])
    renderPagination(data.page || 1, data.totalPages || 1, data.total || 0)
  } catch (e) {
    console.warn('[Load Texts]', e.message)
    textList.textContent = ''
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.textContent = '加载失败'
    textList.appendChild(empty)
  }
}

function renderTextList(texts) {
  textList.textContent = ''
  if (texts.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.textContent = '暂无文本'
    textList.appendChild(empty)
    return
  }

  for (const t of texts) {
    const isActive = t.isActive && (!t.expiresAt || t.expiresAt > Date.now()) && (!t.maxViews || t.currentViews < t.maxViews)
    const item = document.createElement('div')
    item.className = 'text-item'
    item.dataset.id = t.id

    const idDiv = document.createElement('div')
    idDiv.className = 'text-item-id'
    idDiv.textContent = t.id

    const infoDiv = document.createElement('div')
    infoDiv.className = 'text-item-info'
    const time = new Date(t.createdAt).toLocaleString('zh-CN')
    const expiry = t.expiryType === 'count'
      ? `${t.currentViews}/${t.maxViews} 次`
      : (t.expiresAt ? new Date(t.expiresAt).toLocaleString('zh-CN') : '-')
    const infoLine1 = document.createElement('div')
    infoLine1.textContent = `创建：${time}`
    const infoLine2 = document.createElement('div')
    infoLine2.textContent = `到期：${expiry}`
    infoDiv.appendChild(infoLine1)
    infoDiv.appendChild(infoLine2)

    const statusSpan = document.createElement('span')
    statusSpan.className = `text-item-status ${isActive ? 'status-active' : 'status-expired'}`
    statusSpan.textContent = isActive ? '有效' : '失效'

    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'text-item-actions'
    const delBtn = document.createElement('button')
    delBtn.className = 'btn btn-secondary btn-icon delete-btn'
    delBtn.dataset.id = t.id
    delBtn.title = '删除'
    delBtn.textContent = '×'
    actionsDiv.appendChild(delBtn)

    item.appendChild(idDiv)
    item.appendChild(infoDiv)
    item.appendChild(statusSpan)
    item.appendChild(actionsDiv)
    textList.appendChild(item)
  }
}

function renderPagination(page, totalPages, total) {
  if (!pageInfo || !prevPageBtn || !nextPageBtn) return
  pageInfo.textContent = `第 ${page}/${totalPages} 页 (共 ${total} 条)`
  prevPageBtn.disabled = page <= 1
  nextPageBtn.disabled = page >= totalPages
}

function createEl(tag, className, textContent) {
  const el = document.createElement(tag)
  if (className) el.className = className
  if (textContent) el.textContent = textContent
  return el
}

async function showDetail(id) {
  try {
    const res = await fetch(`/api/admin/${encodeURIComponent(id)}`)
    const data = await res.json()

    detailContent.textContent = ''

    if (!res.ok) {
      const errDiv = createEl('div', 'result-title')
      errDiv.style.color = 'var(--danger)'
      errDiv.textContent = data.error
      detailContent.appendChild(errDiv)
      copyTextBtn.disabled = false
      copyTextBtn.textContent = '复制文本'
    } else {
      currentText = data
      const expiry = data.expiryType === 'count'
        ? `${data.currentViews}/${data.maxViews} 次`
        : (data.expiresAt ? new Date(data.expiresAt).toLocaleString('zh-CN') : '-')

      if (data.encrypted) {
        const encryptedDiv = createEl('div', 'detail-encrypted')
        encryptedDiv.textContent = '🔒 端对端加密文本，服务器无法查看原文'
        detailContent.appendChild(encryptedDiv)
        copyTextBtn.disabled = true
        copyTextBtn.textContent = '端对端加密，无法复制原文'
      } else {
        const textDiv = createEl('div', 'detail-text', data.content)
        detailContent.appendChild(textDiv)
        copyTextBtn.disabled = false
        copyTextBtn.textContent = '复制文本'
      }

      const metaDiv = createEl('div', 'detail-meta')
      const metaItems = [
        ['ID', data.id],
        ['创建时间', new Date(data.createdAt).toLocaleString('zh-CN')],
        ['有效期', `${data.expiryValue} ${getUnitLabel(data.expiryUnit)}`],
        ['到期时间', expiry],
        ['查看次数', String(data.currentViews)]
      ]
      for (const [label, value] of metaItems) {
        const item = createEl('div', 'detail-meta-item')
        const labelSpan = createEl('span', null, label)
        const valueSpan = createEl('span', null, value)
        item.appendChild(labelSpan)
        item.appendChild(valueSpan)
        metaDiv.appendChild(item)
      }
      detailContent.appendChild(metaDiv)
    }

    detailModal.classList.remove('hidden')
  } catch (e) {
    console.warn('[Show Detail]', e.message)
    showToast('加载失败')
  }
}

async function deleteText(id) {
  if (!confirm('确定删除该文本？')) return

  try {
    const res = await fetch(`/api/admin/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      detailModal.classList.add('hidden')
      loadTexts(currentSearch, currentPage)
    } else {
      const data = await res.json()
      showToast(data.error || '删除失败')
    }
  } catch (e) {
    console.warn('[Delete Text]', e.message)
    showToast('网络错误')
  }
}

refreshBtn.addEventListener('click', () => loadTexts(currentSearch, currentPage))

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' })
  window.location.href = '/admin/login'
})

searchInput.addEventListener('input', () => {
  clearTimeout(searchInput._timer)
  searchInput._timer = setTimeout(() => {
    loadTexts(searchInput.value.trim(), 1)
  }, 300)
})

closeModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'))
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) detailModal.classList.add('hidden')
})

copyTextBtn.addEventListener('click', async () => {
  if (!currentText) return
  try {
    await navigator.clipboard.writeText(currentText.content)
    copyTextBtn.textContent = '已复制'
    setTimeout(() => { copyTextBtn.textContent = '复制文本' }, 2000)
  } catch {
    try {
      const input = document.createElement('input')
      input.value = currentText.content
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      copyTextBtn.textContent = '已复制'
      setTimeout(() => { copyTextBtn.textContent = '复制文本' }, 2000)
    } catch {
      showToast('复制失败')
    }
  }
})

deleteTextBtn.addEventListener('click', () => {
  if (currentText) deleteText(currentText.id)
})

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) loadTexts(currentSearch, currentPage - 1)
})

nextPageBtn.addEventListener('click', () => {
  loadTexts(currentSearch, currentPage + 1)
})

textList.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete-btn')
  if (deleteBtn) {
    e.stopPropagation()
    deleteText(deleteBtn.dataset.id)
    return
  }
  const item = e.target.closest('.text-item')
  if (item) {
    showDetail(item.dataset.id)
  }
})

settingsBtn.addEventListener('click', () => {
  window.location.href = '/admin/settings'
})

init()
