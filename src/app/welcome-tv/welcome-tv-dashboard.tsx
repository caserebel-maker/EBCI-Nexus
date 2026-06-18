'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Volume2, VolumeX, Tv, CheckCircle2, User } from 'lucide-react'

interface EmployeeData {
    id: string
    employee_code: string
    first_name_th: string
    last_name_th: string
    nickname: string | null
    photo_url: string | null
    department: string | null
    position: string | null
}

interface ScanEvent {
    id: string
    employee_id: string
    scan_time: string
    scan_type: 'in' | 'out' | null
    employee_code: string
}

const DEFAULT_CANVA_SLIDE_URL = 'https://www.canva.com/design/DAHAbWX6Gkw/h-gB3FShFUhkScEcy49C3A/view?embed&autoplay=1&loop=1'
const POPUP_DURATION_MS = 3000

function normalizeSlideUrl(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (trimmed.includes('canva.link/k8z8s2bztmqdixx')) {
        return DEFAULT_CANVA_SLIDE_URL
    }
    try {
        const url = new URL(trimmed)
        const canvaViewMatch = url.pathname.match(/^\/design\/([^/]+)(?:\/([^/]+))?\/view/)
        if (url.hostname.endsWith('canva.com') && canvaViewMatch?.[1]) {
            const designId = canvaViewMatch[1]
            const shareToken = canvaViewMatch[2]
            const embedUrl = new URL(shareToken
                ? `https://www.canva.com/design/${designId}/${shareToken}/view`
                : `https://www.canva.com/design/${designId}/view`)
            embedUrl.searchParams.set('embed', '')
            embedUrl.searchParams.set('autoplay', '1')
            embedUrl.searchParams.set('loop', '1')
            return embedUrl.toString()
        }
    } catch {
        return trimmed
    }
    return trimmed
}

export default function WelcomeTvDashboard() {
    const searchParams = useSearchParams()
    const key = searchParams.get('key')
    const isAuthorized = key === 'ebci2026'
    const rawSlideUrl = searchParams.get('slide')
        ?? searchParams.get('canva')
        ?? process.env.NEXT_PUBLIC_WELCOME_TV_SLIDE_URL
        ?? DEFAULT_CANVA_SLIDE_URL
    const slideUrl = normalizeSlideUrl(rawSlideUrl)
    const slideMode = searchParams.get('mode') === 'slide' || Boolean(slideUrl)
    const showControls = searchParams.get('controls') !== '0'

    // Clock state
    const [timeStr, setTimeStr] = useState('')
    const [dateStr, setDateStr] = useState('')

    // Sound states
    const [audioEnabled, setAudioEnabled] = useState(true)

    // Debug & System Logs
    const [logs, setLogs] = useState<string[]>(['System initialized'])
    const addLog = useCallback((msg: string) => {
        setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString('th-TH', { hour12: false })}] ${msg}`])
    }, [])

    // Real-time scan states
    const [currentScan, setCurrentScan] = useState<ScanEvent | null>(null)
    const [employee, setEmployee] = useState<EmployeeData | null>(null)
    const [showOverlay, setShowOverlay] = useState(false)
    const [greeting, setGreeting] = useState('')

    // Timeout ref for overlay auto-dismissal
    const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Play chime sound using Web Audio API (synthesized major chord)
    const playChime = useCallback(() => {
        if (!audioEnabled) return
        try {
            const AudioContextClass = window.AudioContext || (window as unknown as Window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            if (!AudioContextClass) return
            const ctx = new AudioContextClass()
            const now = ctx.currentTime

            // Play arpeggiated clean chime (C5 -> E5 -> G5 -> C6)
            const notes = [523.25, 659.25, 783.99, 1046.50]
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                
                osc.type = 'sine'
                osc.frequency.setValueAtTime(freq, now + index * 0.06)
                
                gain.gain.setValueAtTime(0, now)
                gain.gain.linearRampToValueAtTime(0.12, now + index * 0.06 + 0.02)
                gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 1.2)
                
                osc.connect(gain)
                gain.connect(ctx.destination)
                
                osc.start(now + index * 0.06)
                osc.stop(now + index * 0.06 + 1.2)
            })
        } catch (e) {
            console.error('[WelcomeTV] Chime failed:', e)
        }
    }, [audioEnabled])

    const showDemoPopup = useCallback(() => {
        if (dismissTimeoutRef.current) {
            clearTimeout(dismissTimeoutRef.current)
        }
        setEmployee({
            id: 'demo',
            employee_code: '466-64',
            first_name_th: 'อรุณี',
            last_name_th: 'นิลบรรจง',
            nickname: 'แอนนี่',
            photo_url: null,
            department: 'ฝ่ายบัญชี-การเงิน',
            position: 'รักษาการผู้จัดการฝ่ายบัญชี-การเงิน',
        })
        setCurrentScan({
            id: 'demo-scan',
            employee_id: 'demo',
            employee_code: '466-64',
            scan_time: new Date().toISOString(),
            scan_type: 'in',
        })
        setGreeting('สวัสดีตอนเช้า ยินดีต้อนรับเข้าทำงาน!')
        setShowOverlay(true)
        playChime()
        dismissTimeoutRef.current = setTimeout(() => {
            setShowOverlay(false)
        }, POPUP_DURATION_MS)
    }, [playChime])

    // Update digital clock every second
    useEffect(() => {
        const updateTime = () => {
            const now = new Date()
            
            // Format time: HH:MM:SS
            setTimeStr(now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }))

            // Format Thai date: วันศุกร์ที่ 30 พฤษภาคม 2569
            setDateStr(now.toLocaleDateString('th-TH', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }))
        }

        updateTime()
        const timer = setInterval(updateTime, 1000)
        return () => clearInterval(timer)
    }, [])

    // Supabase Real-time listener setup
    useEffect(() => {
        if (!isAuthorized) return

        setTimeout(() => addLog('กำลังเชื่อมต่อ Supabase Realtime...'), 0)

        const channel = supabase
            .channel('welcome_tv_scans')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'card_scans'
            }, async (payload) => {
                const newScan = payload.new as ScanEvent
                addLog(`ตรวจพบการแตะบัตรใหม่: รหัส ${newScan.employee_code || 'ไม่ระบุ'} (${newScan.scan_type || 'ไม่มีประเภท'})`)

                // Cancel existing dismissal timeout if a new scan arrives
                if (dismissTimeoutRef.current) {
                    clearTimeout(dismissTimeoutRef.current)
                }

                try {
                    // Fetch full employee profile details (secured by RLS which only allows SELECT for swiped employee)
                    const { data: empData, error: empError } = await supabase
                         .from('employees')
                         .select('id, employee_code, first_name_th, last_name_th, nickname, photo_url, department, position')
                         .eq('id', newScan.employee_id)
                         .maybeSingle()

                    if (empError) {
                        addLog(`ดึงข้อมูลพนักงานล้มเหลว: ${empError.message}`)
                        return
                    }

                    if (empData) {
                        const employeeInfo = empData as EmployeeData
                        addLog(`โหลดข้อมูลพนักงานสำเร็จ: ${employeeInfo.first_name_th} (${employeeInfo.nickname || 'ไม่มีชื่อเล่น'})`)
                        setEmployee(employeeInfo)
                        setCurrentScan(newScan)
                        
                        // Select greeting message based on scan type & time of day
                        const scanTimeObj = new Date(newScan.scan_time)
                        const hour = scanTimeObj.getHours()
                        const type = newScan.scan_type

                        let msg = 'บันทึกการแตะบัตรสำเร็จ'
                        if (type === 'in') {
                            msg = 'ยินดีต้อนรับเข้าทำงาน! สวัสดีครับ/ค่ะ'
                        } else if (type === 'out') {
                            msg = 'เดินทางกลับบ้านปลอดภัยครับ/ค่ะ!'
                        } else {
                            // Fallback if device does not specify in/out
                            msg = hour < 12 
                                ? 'สวัสดีตอนเช้า ยินดีต้อนรับเข้าทำงาน!' 
                                : 'เลิกงานแล้ว เดินทางกลับบ้านปลอดภัยครับ/ค่ะ!'
                        }
                        
                        setGreeting(msg)
                        setShowOverlay(true)
                        
                        // Trigger welcome chime sound
                        playChime()

                        // Auto dismiss quickly so the TV returns to the slide.
                        dismissTimeoutRef.current = setTimeout(() => {
                            setShowOverlay(false)
                        }, POPUP_DURATION_MS)
                    } else {
                        addLog(`ไม่พบข้อมูลพนักงานสำหรับ ID: ${newScan.employee_id} (อาจติด RLS Policy หรือข้อมูลไม่ตรง)`)
                    }
                } catch (err: unknown) {
                    const errMsg = err instanceof Error ? err.message : String(err)
                    addLog(`เกิดข้อผิดพลาดในการประมวลผล: ${errMsg}`)
                }
            })
            .subscribe((status, err) => {
                if (err) {
                    addLog(`การเชื่อมต่อมีปัญหา: ${err.message}`)
                } else {
                    addLog(`สถานะการเชื่อมต่อ: ${status}`)
                }
            })

        return () => {
            if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
            supabase.removeChannel(channel)
        }
    }, [isAuthorized, playChime, addLog])

    // Resolve employee profile photo URL
    const getPhotoUrl = (path: string | null) => {
        if (!path) return null
        if (path.startsWith('http://') || path.startsWith('https://')) return path
        const { data } = supabase.storage.from('employee-photos').getPublicUrl(path)
        return data?.publicUrl || null
    }

    if (!isAuthorized) {
        return (
            <div className="h-screen w-screen bg-[#0c0c0e] flex flex-col items-center justify-center text-white px-4 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md">
                    <h1 className="text-3xl font-bold text-red-400 mb-4">เข้าถึงไม่สำเร็จ</h1>
                    <p className="text-neutral-400 mb-6">กรุณาระบุรหัสผ่านที่ถูกต้องใน URL (เช่น /welcome-tv?key=xxxx) เพื่อเปิดใช้งานหน้าจอทีวี</p>
                    <div className="text-xs text-neutral-600 font-mono">EBCI NEXUS · WELCOME TV</div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen bg-[#070709] bg-[radial-gradient(circle_at_center,_rgba(86,30,35,0.16)_0%,_transparent_65%)] text-white overflow-hidden flex flex-col justify-between items-center p-6 sm:p-12 relative font-sans select-none">
            {slideMode && (
                <div
                    className="absolute left-1/2 top-1/2 z-0 overflow-hidden bg-[#160407] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_28px_90px_rgba(0,0,0,0.55)]"
                    style={{
                        width: 'min(100vw, 56.25vh)',
                        height: 'min(100vh, 177.78vw)',
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    {slideUrl ? (
                        <iframe
                            src={slideUrl}
                            title="EBCI TV slide"
                            className="h-full w-full border-0"
                            allow="autoplay; fullscreen"
                        />
                    ) : (
                        <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(253,186,116,0.20),_transparent_33%),linear-gradient(180deg,_#25070b_0%,_#7b2031_52%,_#2a070d_100%)]">
                            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(90deg,_rgba(255,255,255,0.08)_1px,_transparent_1px),linear-gradient(0deg,_rgba(255,255,255,0.06)_1px,_transparent_1px)] bg-[size:54px_54px]" />
                            <div className="relative flex h-full flex-col px-10 py-14 text-center">
                                <div className="text-left">
                                    <div className="text-4xl font-black italic tracking-[0.14em] text-white drop-shadow-lg">EBCI</div>
                                    <div className="mt-1 text-sm font-semibold tracking-[0.45em] text-white/55">NEXUS</div>
                                </div>
                                <div className="flex flex-1 flex-col items-center justify-center">
                                    <div className="mb-5 rounded-full border border-amber-200/25 bg-amber-100/10 px-5 py-2 text-sm font-bold tracking-[0.3em] text-amber-100">
                                        TV SLIDE PREVIEW
                                    </div>
                                    <h1 className="text-5xl font-black leading-tight text-white drop-shadow-2xl">
                                        Company News
                                    </h1>
                                    <h2 className="mt-2 text-4xl font-light text-amber-100/90">
                                        & Welcome Screen
                                    </h2>
                                    <p className="mt-8 max-w-sm text-lg leading-relaxed text-white/68">
                                        ตรงนี้จะเป็น Canva slide แนวตั้งจริง และ popup ต้อนรับจะลอยทับเมื่อพนักงานแตะบัตร
                                    </p>
                                    <div className="mt-10 grid w-full grid-cols-1 gap-4">
                                        {['ประกาศบริษัท', 'กิจกรรมประจำเดือน', 'สวัสดีวันทำงาน'].map((label, index) => (
                                            <div key={label} className="rounded-3xl border border-white/12 bg-white/9 p-5 text-left backdrop-blur-sm">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <div className="text-lg font-bold text-white">{label}</div>
                                                        <div className="mt-1 text-xs text-white/45">ตัวอย่างสไลด์แนวตั้ง #{index + 1}</div>
                                                    </div>
                                                    <div className="h-10 w-10 rounded-2xl bg-amber-200/20" />
                                                </div>
                                                <div className="mt-4 h-2 rounded-full bg-white/18">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-rose-200" style={{ width: `${66 - index * 12}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/28" />
                </div>
            )}
            {/* Top Bar controls */}
            {showControls && <div className="w-full flex justify-between items-center z-20">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                    <Tv className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-semibold tracking-wider text-neutral-300">
                        {slideMode ? 'EBCI TV OVERLAY MODE' : 'EBCI TV SYSTEM'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={showDemoPopup}
                        className="flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition-all hover:bg-emerald-500/20 active:scale-95"
                    >
                        ทดลอง popup
                    </button>
                    <button
                        onClick={() => {
                            setAudioEnabled(!audioEnabled)
                            // Trigger play check to satisfy gesture requirement
                            if (!audioEnabled) {
                                setTimeout(playChime, 100)
                            }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all active:scale-95 ${
                            audioEnabled
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {audioEnabled ? (
                            <>
                                <Volume2 className="w-4 h-4" />
                                <span className="text-sm font-medium">เปิดเสียงต้อนรับแล้ว · คลิกเพื่อปิด</span>
                            </>
                        ) : (
                            <>
                                <VolumeX className="w-4 h-4" />
                                <span className="text-sm font-medium">ปิดเสียงอยู่ · คลิกเพื่อเปิด</span>
                            </>
                        )}
                    </button>
                </div>
            </div>}

            {/* Standby Digital Clock & Date */}
            <div className={`flex flex-col items-center justify-center flex-1 transition-all duration-700 ${slideMode ? 'opacity-0 pointer-events-none' : showOverlay ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                <div className="text-[9vw] text-7xl md:text-8xl lg:text-[9vw] font-black tracking-tighter text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.06)] font-mono tabular-nums leading-none text-center">
                    {timeStr || '00:00:00'}
                </div>
                <div className="text-4xl font-light text-neutral-400 mt-6 tracking-wide drop-shadow-sm">
                    {dateStr}
                </div>
                <div className="mt-8 bg-amber-500/5 border border-amber-500/10 px-8 py-3 rounded-full text-amber-200/70 text-lg font-light tracking-widest animate-pulse">
                    ทาบบัตรเพื่อบันทึกเวลาทำงาน
                </div>
            </div>

            {/* Animated Welcome Overlay Card */}
            <div className={`absolute inset-0 z-10 flex items-center justify-center p-6 transition-all duration-500 ${
                slideMode ? 'bg-transparent' : 'bg-[#070709]/80 backdrop-blur-md'
            } ${
                showOverlay ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-105 pointer-events-none'
            }`}>
                {employee && currentScan && (
                    <div className="relative aspect-[1187/1672] h-[min(88vh,760px)] overflow-hidden rounded-[1.4rem] shadow-[0_0_54px_rgba(255,80,96,0.44),0_34px_90px_rgba(0,0,0,0.72)] transition-all animate-[fadeIn_0.5s_ease-out]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/assets/welcome-tv-popup-frame.png"
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />

                        <div className="absolute left-[8%] right-[8%] top-[6%] z-10 flex items-start justify-between gap-5">
                            <div className="text-left">
                                <div className="text-[clamp(1.6rem,3.2vh,2.6rem)] font-black italic tracking-[0.18em] text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.55)]">
                                    EBCI
                                </div>
                                <div className="mt-1 text-[clamp(0.5rem,1vh,0.75rem)] font-semibold tracking-[0.48em] text-white/48">
                                    NEXUS
                                </div>
                            </div>
                            <div className="flex items-start gap-4 text-right">
                                <div className="mt-1 h-12 w-px bg-rose-100/50 shadow-[0_0_18px_rgba(255,170,170,0.9)]" />
                                <div>
                                    <div className="font-mono text-[clamp(1.7rem,3.6vh,3rem)] font-light leading-none text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.3)]">
                                        {new Date(currentScan.scan_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </div>
                                    <div className="mt-2 text-[clamp(0.65rem,1.25vh,0.9rem)] font-medium text-white/82">
                                        {new Date(currentScan.scan_time).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute left-[8%] right-[8%] top-[16%] z-10 text-center">
                            <h2 className="text-[clamp(1.8rem,3.8vh,3rem)] font-bold leading-tight text-white drop-shadow-[0_0_18px_rgba(255,190,190,0.72)]">
                                {currentScan.scan_type === 'out' ? 'ขอบคุณสำหรับวันนี้' : 'ยินดีต้อนรับกลับมา'}
                            </h2>
                            <div className="mt-3 text-[clamp(1.25rem,2.8vh,2.2rem)] font-semibold text-rose-100/90">
                                คุณ{employee.nickname || employee.first_name_th}
                            </div>
                        </div>

                        <div className="absolute left-[21%] right-[21%] top-[30%] z-10 h-[39%] overflow-hidden rounded-[0.55rem] bg-[#28070d] [clip-path:polygon(7%_0,93%_0,100%_7%,100%_93%,93%_100%,7%_100%,0_93%,0_7%)]">
                            {getPhotoUrl(employee.photo_url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={getPhotoUrl(employee.photo_url)!}
                                    alt={employee.first_name_th}
                                    className="h-full w-full object-cover object-top"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-rose-900/70 to-red-700/50">
                                    <User className="h-28 w-28 text-rose-100/70" />
                                </div>
                            )}
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#22040a]/22" />
                        </div>

                        <div className="absolute left-[28%] right-[11%] top-[76.6%] z-10 text-left">
                            <div className="text-[clamp(1.1rem,2.15vh,1.75rem)] font-bold leading-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.36)]">
                                {currentScan.scan_type === 'out' ? 'บันทึกเวลาออกงานเรียบร้อยแล้ว' : 'บันทึกเวลาเข้างานเรียบร้อยแล้ว'}
                            </div>
                            <div className="mt-1 text-[clamp(0.85rem,1.55vh,1.15rem)] text-rose-100/78">
                                {currentScan.scan_type === 'out' ? 'Check-out successful' : 'Check-in successful'}
                            </div>
                        </div>

                        <div className="absolute bottom-[7.5%] left-[10%] right-[10%] z-10 text-center">
                            <p className="text-[clamp(0.75rem,1.4vh,1rem)] font-medium text-white/82">
                                {employee.first_name_th} {employee.last_name_th} ({employee.employee_code})
                            </p>
                            <p className="mt-1 truncate text-[clamp(0.65rem,1.15vh,0.85rem)] text-rose-100/56">
                                {employee.department || '-'}{employee.position ? ` · ${employee.position}` : ''}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Debug logs (subtle at bottom left) */}
            {showControls && <div className="absolute bottom-4 left-4 text-[10px] font-mono text-neutral-500 max-w-xs text-left z-30 pointer-events-auto bg-black/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all max-h-36 overflow-y-auto">
                <div className="font-bold text-neutral-400 mb-1 flex items-center justify-between gap-4">
                    <span>TV STATUS LOGS</span>
                    <button className="text-[8px] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded text-neutral-400" onClick={() => setLogs([])}>clear</button>
                </div>
                {logs.map((log, i) => (
                    <div key={i} className="leading-tight mt-0.5 truncate">{log}</div>
                ))}
            </div>}

            {/* General Banner Footer */}
            <div className={`w-full text-center z-20 ${slideMode ? 'opacity-0' : ''}`}>
                <p className="text-sm tracking-widest text-neutral-600 font-medium uppercase">
                    EBCI Nexus · Digital Welcomer
                </p>
            </div>
        </div>
    )
}
