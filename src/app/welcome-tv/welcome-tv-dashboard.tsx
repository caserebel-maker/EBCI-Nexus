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

export default function WelcomeTvDashboard() {
    const searchParams = useSearchParams()
    const key = searchParams.get('key')
    const isAuthorized = key === 'ebci2026'

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
        <div className="h-screen w-screen bg-[#070709] bg-[radial-gradient(circle_at_center,_rgba(86,30,35,0.16)_0%,_transparent_65%)] text-white overflow-hidden flex flex-col justify-between items-center p-12 relative font-sans select-none">
            {/* Top Bar controls */}
            <div className="w-full flex justify-between items-center z-20">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                    <Tv className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-semibold tracking-wider text-neutral-300">EBCI TV SYSTEM</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>

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

            {/* Standby Digital Clock & Date */}
            <div className={`flex flex-col items-center justify-center flex-1 transition-all duration-700 ${showOverlay ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
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
            <div className={`absolute inset-0 z-10 flex items-center justify-center p-12 transition-all duration-500 bg-[#070709]/80 backdrop-blur-md ${
                showOverlay ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-105 pointer-events-none'
            }`}>
                {employee && currentScan && (
                    <div className="w-full max-w-4xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.12] rounded-[2.5rem] p-12 shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col items-center text-center relative overflow-hidden transition-all transform animate-[fadeIn_0.5s_ease-out]">
                        
                        {/* Glow decorative ring */}
                        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30 ${
                            currentScan.scan_type === 'out' ? 'bg-amber-500' : 'bg-green-500'
                        }`}></div>
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-maroon-500"></div>

                        {/* Top Badge */}
                        <div className={`flex items-center gap-2 px-5 py-2 rounded-full border mb-8 text-lg font-semibold tracking-wider ${
                            currentScan.scan_type === 'out' 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                                : 'bg-green-500/10 border-green-500/30 text-green-400'
                        }`}>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>{currentScan.scan_type === 'out' ? 'สแกนออกงาน (CHECK OUT)' : 'สแกนเข้างาน (CHECK IN)'}</span>
                        </div>

                        {/* Employee Avatar */}
                        <div className="relative mb-6">
                            <div className={`w-52 h-52 rounded-full p-1.5 border-2 ${
                                currentScan.scan_type === 'out' ? 'border-amber-400/50' : 'border-green-400/50'
                            }`}>
                                {getPhotoUrl(employee.photo_url) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={getPhotoUrl(employee.photo_url)!} 
                                        alt={employee.first_name_th}
                                        className="w-full h-full object-cover rounded-full shadow-inner"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500/20 to-red-500/20 flex items-center justify-center">
                                        <User className="w-24 h-24 text-neutral-400" />
                                    </div>
                                )}
                            </div>
                            {/* Inner absolute time badge */}
                            <div className="absolute -bottom-2 right-2 bg-neutral-900 border border-white/20 text-white font-mono text-sm px-4 py-1.5 rounded-full shadow-lg">
                                {new Date(currentScan.scan_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.
                            </div>
                        </div>

                        {/* Greeting message */}
                        <h2 className="text-4xl font-light text-neutral-400 mb-3 tracking-wide">
                            {greeting}
                        </h2>

                        {/* Nickname in huge typography */}
                        <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 drop-shadow-md tracking-tight mb-2">
                            คุณ{employee.nickname || employee.first_name_th}
                        </h1>

                        {/* Full Name & Employee Code */}
                        <p className="text-2xl text-neutral-300 font-medium mb-6">
                            {employee.first_name_th} {employee.last_name_th} ({employee.employee_code})
                        </p>

                        {/* Department / Position tags */}
                        <div className="flex gap-3 justify-center">
                            {employee.department && (
                                <span className="bg-white/5 border border-white/10 px-5 py-1.5 rounded-full text-base font-medium text-neutral-300">
                                    แผนก: {employee.department}
                                </span>
                            )}
                            {employee.position && (
                                <span className="bg-white/5 border border-white/10 px-5 py-1.5 rounded-full text-base font-medium text-neutral-400">
                                    {employee.position}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Debug logs (subtle at bottom left) */}
            <div className="absolute bottom-4 left-4 text-[10px] font-mono text-neutral-500 max-w-xs text-left z-30 pointer-events-auto bg-black/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all max-h-36 overflow-y-auto">
                <div className="font-bold text-neutral-400 mb-1 flex items-center justify-between gap-4">
                    <span>TV STATUS LOGS</span>
                    <button className="text-[8px] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded text-neutral-400" onClick={() => setLogs([])}>clear</button>
                </div>
                {logs.map((log, i) => (
                    <div key={i} className="leading-tight mt-0.5 truncate">{log}</div>
                ))}
            </div>

            {/* General Banner Footer */}
            <div className="w-full text-center z-20">
                <p className="text-sm tracking-widest text-neutral-600 font-medium uppercase">
                    EBCI Nexus · Digital Welcomer
                </p>
            </div>
        </div>
    )
}
