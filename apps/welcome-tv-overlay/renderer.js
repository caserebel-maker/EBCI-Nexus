const bridge = window.overlayBridge
const config = bridge.readConfig()
const statusEl = document.getElementById('status')
const overlayEl = document.getElementById('overlay')
const frameEl = document.getElementById('frame')
const logoEl = document.getElementById('logo')
const photoEl = document.getElementById('photo')
const fallbackAvatarEl = document.getElementById('fallbackAvatar')
const timeEl = document.getElementById('time')
const dateEl = document.getElementById('date')
const titleEl = document.getElementById('title')
const nicknameEl = document.getElementById('nickname')
const statusThaiEl = document.getElementById('statusThai')
const statusEnglishEl = document.getElementById('statusEnglish')
const fullNameEl = document.getElementById('fullName')
const metaEl = document.getElementById('meta')

frameEl.src = bridge.assets.frame
logoEl.src = bridge.assets.logo

let dismissTimer = null
let logTimer = null
let audioContext = null

function log(message) {
  const now = new Date().toLocaleTimeString('th-TH', { hour12: false })
  statusEl.textContent = `[${now}] ${message}`
  clearTimeout(logTimer)
  logTimer = setTimeout(() => {
    if (!overlayEl.classList.contains('show')) {
      statusEl.style.opacity = '0.25'
    }
  }, 6000)
  statusEl.style.opacity = '0.82'
}

function formatDate(date) {
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: config.timezone || 'Asia/Bangkok',
  })
}

function formatTime(date) {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: config.timezone || 'Asia/Bangkok',
  })
}

function photoUrl(path) {
  return bridge.getEmployeePhotoUrl(path)
}

function playChime() {
  if (config.soundEnabled === false) return

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)()
    const now = audioContext.currentTime
    const master = audioContext.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.03)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.72)
    master.connect(audioContext.destination)

    ;[660, 880, 1320].forEach((frequency, index) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const start = now + index * 0.09
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.95, start + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34)
      osc.connect(gain)
      gain.connect(master)
      osc.start(start)
      osc.stop(start + 0.38)
    })
  } catch (error) {
    log(`Audio skipped: ${error.message}`)
  }
}

async function showPopup(scan, employee) {
  clearTimeout(dismissTimer)

  const scanDate = new Date(scan.scan_time || Date.now())
  const isOut = scan.scan_type === 'out'
  timeEl.textContent = formatTime(scanDate)
  dateEl.textContent = formatDate(scanDate)
  titleEl.textContent = isOut ? 'ขอบคุณสำหรับวันนี้' : 'ยินดีต้อนรับกลับมา'
  nicknameEl.textContent = `คุณ${employee.nickname || employee.first_name_th || 'พนักงาน'}`
  statusThaiEl.textContent = isOut ? 'บันทึกเวลาออกงานเรียบร้อยแล้ว' : 'บันทึกเวลาเข้างานเรียบร้อยแล้ว'
  statusEnglishEl.textContent = isOut ? 'Check-out successful' : 'Check-in successful'
  fullNameEl.textContent = `${employee.first_name_th || ''} ${employee.last_name_th || ''} (${employee.employee_code || scan.employee_code || '-'})`
  metaEl.textContent = `${employee.department || '-'}${employee.position ? ` · ${employee.position}` : ''}`

  const imageUrl = photoUrl(employee.photo_url)
  if (imageUrl) {
    photoEl.src = imageUrl
    photoEl.style.display = 'block'
    fallbackAvatarEl.style.display = 'none'
  } else {
    photoEl.removeAttribute('src')
    photoEl.style.display = 'none'
    fallbackAvatarEl.style.display = 'grid'
  }

  overlayEl.classList.add('show')
  playChime()
  log(`Popup: ${employee.first_name_th || ''} ${employee.nickname ? `(${employee.nickname})` : ''}`)
  dismissTimer = setTimeout(() => {
    overlayEl.classList.remove('show')
  }, config.popupDurationMs || 3000)
}

async function handleScan(scan) {
  try {
    log(`Scan received: ${scan.employee_code || scan.employee_id}`)
    const data = await bridge.fetchEmployee(scan.employee_id)
    if (!data) {
      log(`Employee not found for ${scan.employee_id}`)
      return
    }

    await showPopup(scan, data)
  } catch (error) {
    log(`Scan handling failed: ${error.message}`)
  }
}

async function startRealtime() {
  if (config.error) {
    log(config.error)
    return
  }

  log('Connecting to Supabase Realtime...')

  bridge.subscribeToScans(
    ({ status, error }) => {
      if (error) {
        log(`Realtime error: ${error}`)
      } else {
        log(`Realtime status: ${status}`)
      }
    },
    (scan) => handleScan(scan)
  )
}

bridge.onDemoPopup(() => {
  showPopup({
    id: 'demo',
    employee_id: 'demo',
    employee_code: '466-64',
    scan_time: new Date().toISOString(),
    scan_type: 'in',
  }, {
    employee_code: '466-64',
    first_name_th: 'อรุณี',
    last_name_th: 'นิลบรรจง',
    nickname: 'แอนนี่',
    photo_url: '',
    department: 'ฝ่ายบัญชี-การเงิน',
    position: 'รักษาการผู้จัดการฝ่ายบัญชี-การเงิน',
  })
})

startRealtime()
