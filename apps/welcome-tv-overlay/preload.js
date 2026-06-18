const { contextBridge, ipcRenderer } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { createClient } = require('@supabase/supabase-js')

let supabase = null
let scanChannel = null

function readConfig() {
  const configPath = path.join(__dirname, 'config.json')
  if (!fs.existsSync(configPath)) {
    return { error: 'Missing config.json. Copy config.example.json to config.json first.' }
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (error) {
    return { error: `Cannot read config.json: ${error.message}` }
  }
}

function getClient() {
  const config = readConfig()
  if (config.error) {
    throw new Error(config.error)
  }
  if (!supabase) {
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)
  }
  return supabase
}

contextBridge.exposeInMainWorld('overlayBridge', {
  readConfig,
  assets: {
    frame: pathToFileURL(path.join(__dirname, 'assets', 'frame1.png')).href,
    logo: pathToFileURL(path.join(__dirname, 'assets', 'ebci-logo-silver.png')).href,
  },
  onDemoPopup(callback) {
    ipcRenderer.on('demo-popup', callback)
  },
  subscribeToScans(onStatus, onScan) {
    const client = getClient()
    if (scanChannel) {
      client.removeChannel(scanChannel)
      scanChannel = null
    }

    scanChannel = client
      .channel('welcome_tv_windows_overlay')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'card_scans',
      }, (payload) => {
        onScan(payload.new)
      })
      .subscribe((status, error) => {
        onStatus({ status, error: error?.message || null })
      })

    return { ok: true }
  },
  async fetchEmployee(employeeId) {
    const client = getClient()
    const { data, error } = await client
      .from('employees')
      .select('id, employee_code, first_name_th, last_name_th, nickname, photo_url, department, position')
      .eq('id', employeeId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }
    return data
  },
  getEmployeePhotoUrl(photoPath) {
    if (!photoPath) return ''
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath
    const client = getClient()
    const { data } = client.storage.from('employee-photos').getPublicUrl(photoPath)
    return data?.publicUrl || ''
  },
})
