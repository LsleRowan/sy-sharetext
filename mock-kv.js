// 本地开发用内存模拟 KV
const store = new Map()

export const mockKV = {
  async get(key) {
    return store.get(key) || null
  },

  async put(key, value) {
    store.set(key, value)
  },

  async delete(key) {
    store.delete(key)
  },

  async list({ prefix } = {}) {
    const keys = []
    for (const key of store.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        keys.push({ name: key })
      }
    }
    return { keys }
  }
}

// 初始化一些测试数据
export function initMockData() {
  if (store.size === 0) {
    console.log('[MockKV] Initialized with empty store')
  }
}
