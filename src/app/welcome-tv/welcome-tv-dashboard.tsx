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

const DEFAULT_CANVA_SLIDE_URL = 'https://www.canva.com/design/DAHAbWX6Gkw/h-gB3FShFUhkScEcy49C3A/view?embed'

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
            return shareToken
                ? `https://www.canva.com/design/${designId}/${shareToken}/view?embed`
                : `https://www.canva.com/design/${designId}/view?embed`
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
    const [audioEnabled, setAudioEnabled] = useState(false)

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
        }, 8000)
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

                        // Auto dismiss after 8 seconds and fade back to clock
                        dismissTimeoutRef.current = setTimeout(() => {
                            setShowOverlay(false)
                        }, 8000)
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
                            allow="fullscreen"
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
                                <span className="text-sm font-medium">เปิดเสียงต้อนรับแล้ว</span>
                            </>
                        ) : (
                            <>
                                <VolumeX className="w-4 h-4" />
                                <span className="text-sm font-medium">คลิกเพื่อเปิดเสียงต้อนรับ</span>
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
                    <div className="relative flex w-[min(90vw,640px)] flex-col items-center overflow-hidden rounded-[2.1rem] border border-rose-200/28 bg-[radial-gradient(circle_at_50%_20%,rgba(255,141,141,0.26),transparent_34%),linear-gradient(160deg,rgba(26,4,8,0.96),rgba(110,16,35,0.94)_54%,rgba(32,4,10,0.96))] px-8 py-8 text-center shadow-[0_0_0_1px_rgba(255,170,170,0.16),0_0_48px_rgba(255,78,100,0.35),0_36px_90px_rgba(0,0,0,0.66)] backdrop-blur-xl transition-all animate-[fadeIn_0.5s_ease-out] sm:px-10 sm:py-9">
                        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
                        <div className="pointer-events-none absolute left-8 right-8 top-24 h-px bg-gradient-to-r from-transparent via-rose-200/80 to-transparent shadow-[0_0_22px_rgba(255,150,150,0.95)]" />
                        <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-rose-400/18 blur-3xl" />
                        <div className="pointer-events-none absolute -right-24 bottom-12 h-64 w-64 rounded-full bg-red-500/22 blur-3xl" />

                        <div className="relative z-10 flex w-full items-start justify-between gap-6">
                            <div className="text-left">
                                <div className="text-4xl font-black italic tracking-[0.18em] text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.45)] sm:text-5xl">
                                    EBCI
                                </div>
                                <div className="mt-1 text-xs font-semibold tracking-[0.48em] text-white/45">
                                    NEXUS
                                </div>
                            </div>
                            <div className="flex items-start gap-4 text-right">
                                <div className="mt-1 h-14 w-px bg-rose-100/45 shadow-[0_0_18px_rgba(255,170,170,0.85)]" />
                                <div>
                                    <div className="font-mono text-4xl font-light leading-none text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.24)] sm:text-5xl">
                                        {new Date(currentScan.scan_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white/78 sm:text-base">
                                        {new Date(currentScan.scan_time).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-10">
                            <h2 className="text-4xl font-bold leading-tight text-white drop-shadow-[0_0_18px_rgba(255,190,190,0.62)] sm:text-5xl">
                                {currentScan.scan_type === 'out' ? 'ขอบคุณสำหรับวันนี้' : 'ยินดีต้อนรับกลับมา'}
                            </h2>
                            <div className="mx-auto mt-4 flex w-[min(84vw,420px)] items-center justify-center gap-3">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-200/80 to-rose-200/40" />
                                <div className="h-1.5 w-14 rounded-full bg-rose-100 shadow-[0_0_18px_rgba(255,180,180,0.9)]" />
                                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-rose-200/80 to-rose-200/40" />
                            </div>
                            <div className="mt-5 text-3xl font-semibold text-rose-100/90 sm:text-4xl">
                                คุณ{employee.nickname || employee.first_name_th}
                            </div>
                        </div>

                        <div className="relative z-10 mt-8 w-full max-w-[500px]">
                            <div className="absolute -inset-3 border border-rose-200/36 shadow-[inset_0_0_24px_rgba(255,127,127,0.24),0_0_26px_rgba(255,90,110,0.58)] [clip-path:polygon(9%_0,91%_0,100%_9%,100%_91%,91%_100%,9%_100%,0_91%,0_9%)]" />
                            <div className="absolute -inset-5 border border-rose-300/30 [clip-path:polygon(14%_0,86%_0,100%_14%,100%_86%,86%_100%,14%_100%,0_86%,0_14%)]" />
                            <div className="absolute left-1/2 top-[-18px] h-2 w-32 -translate-x-1/2 rounded-full bg-rose-100 shadow-[0_0_24px_rgba(255,190,190,1)]" />
                            <div className="absolute bottom-[-18px] left-1/2 h-2 w-40 -translate-x-1/2 rounded-full bg-rose-100 shadow-[0_0_28px_rgba(255,190,190,1)]" />

                            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-rose-100/8 to-black/20 [clip-path:polygon(9%_0,91%_0,100%_9%,100%_91%,91%_100%,9%_100%,0_91%,0_9%)]">
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
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#22040a]/32" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-9 w-full max-w-[500px] rounded-3xl border border-rose-200/44 bg-black/20 px-7 py-5 shadow-[inset_0_0_22px_rgba(255,120,120,0.12),0_0_28px_rgba(255,82,100,0.28)]">
                            <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-100 shadow-[0_0_16px_rgba(255,210,210,1)]" />
                            <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-rose-100 shadow-[0_0_16px_rgba(255,210,210,1)]" />
                            <div className="flex items-center gap-5 text-left">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-rose-100/52 bg-rose-500/12 shadow-[0_0_28px_rgba(255,113,113,0.45)]">
                                    <CheckCircle2 className="h-12 w-12 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.86)]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-2xl font-bold text-white sm:text-3xl">
                                        {currentScan.scan_type === 'out' ? 'บันทึกเวลาออกงานเรียบร้อยแล้ว' : 'บันทึกเวลาเข้างานเรียบร้อยแล้ว'}
                                    </div>
                                    <div className="mt-1 text-lg text-rose-100/78">
                                        {currentScan.scan_type === 'out' ? 'Check-out successful' : 'Check-in successful'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-5 max-w-[500px] text-center">
                            <p className="text-lg font-medium text-white/86">
                                {employee.first_name_th} {employee.last_name_th} ({employee.employee_code})
                            </p>
                            <p className="mt-1 text-base text-rose-100/64">
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
