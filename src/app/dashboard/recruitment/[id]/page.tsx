import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    GraduationCap,
    Calendar,
    ArrowLeft,
    Clock,
    DollarSign,
    Heart,
    FileText,
    Download,
    ChevronRight,
    Home
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { StatusSelector } from "./status-selector"
import { ImageViewer } from "./image-viewer"
import { PrintButton } from "./print-button"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ApplicantDetailPage({ params }: PageProps) {
    const { id } = await params

    const applicant = await prisma.applicant.findUnique({
        where: { id },
        include: {
            educations: {
                orderBy: { level: 'desc' }
            },
            experiences: {
                orderBy: { startDate: 'desc' }
            }
        }
    })

    if (!applicant) {
        notFound()
    }

    // Helper to format date
    const formatDate = (date: Date | null | undefined) => {
        if (!date) return "-"
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="space-y-8 pb-20 print:p-0 print:space-y-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest print:hidden">
                <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
                    <Home size={12} /> Dashboard
                </Link>
                <ChevronRight size={12} />
                <Link href="/dashboard/recruitment" className="hover:text-white transition-colors">
                    Recruitment
                </Link>
                <ChevronRight size={12} />
                <span className="text-white/80">Applicant Detail</span>
            </nav>

            {/* Header & Back Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/recruitment"
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors text-white print:hidden"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-[0.2em] leading-relaxed">Applicant Profile</h1>
                        <p className="text-white/60 text-sm font-medium">รายละเอียดข้อมูลผู้สมัครโดยละเอียด</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 print:hidden">
                    <PrintButton />
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-2xl border border-white/10 shadow-2xl">
                        <StatusSelector applicantId={applicant.id} initialStatus={applicant.status} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
                {/* Left Column - Main Info (8 cols) */}
                <div className="lg:col-span-8 space-y-8 print:space-y-4">

                    {/* 1. Basic Info Card */}
                    <div className="glass rounded-3xl overflow-hidden border border-white/10 print:bg-white print:text-black print:border-black print:rounded-none shadow-2xl">
                        <div className="bg-brand-gradient p-8 text-white print:bg-none print:text-black print:p-4 print:border-b border-black">
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-end print:gap-4">
                                {/* Photo */}
                                <div className="h-44 w-44 rounded-2xl border-4 border-white/20 overflow-hidden bg-black/20 backdrop-blur-md shadow-2xl print:h-32 print:w-32">
                                    {applicant.photoPath ? (
                                        <ImageViewer src={applicant.photoPath} alt={applicant.firstName} />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center rounded-2xl border-4 border-white/20 bg-black/20 backdrop-blur-md">
                                            <User size={64} className="text-white/20" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold uppercase tracking-[0.2em] text-white/70 print:text-black/60">Position Applied</div>
                                        <h2 className="text-3xl font-black uppercase text-white tracking-[0.1em] print:text-black">{applicant.positionApplied}</h2>
                                    </div>
                                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4 items-baseline">
                                        <h3 className="text-5xl font-normal text-white print:text-3xl print:text-black">{applicant.firstName} {applicant.lastName}</h3>
                                        {applicant.nickname && (
                                            <span className="text-3xl font-light text-white/50 print:text-black/40">({applicant.nickname})</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 grid grid-cols-2 lg:grid-cols-4 gap-10 print:p-4 print:gap-4">
                            <InfoItem icon={<User size={16} />} label="เพศ" value={applicant.gender} />
                            <InfoItem icon={<Calendar size={16} />} label="วันเกิด" value={formatDate(applicant.dateOfBirth)} />
                            <InfoItem icon={<Clock size={16} />} label="อายุ" value={`${applicant.age} ปี`} />
                            <InfoItem icon={<Heart size={16} />} label="สถานภาพสมรส" value={applicant.maritalStatus} />
                            <InfoItem label="สัญชาติ" value={applicant.nationality} />
                            <InfoItem label="ศาสนา" value={applicant.religion} />
                            <InfoItem label="เชื้อชาติ" value={applicant.race} />
                            <InfoItem label="สถานะทางทหาร" value={applicant.militaryStatus} />
                        </div>
                    </div>

                    {/* 2. Contact & Address */}
                    <div className="glass rounded-3xl p-10 space-y-8 border border-white/10 print:border print:rounded-none print:p-4 print:bg-white print:text-black shadow-xl">
                        <SectionTitle icon={<Mail />} title="Contact Information" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 print:gap-4">
                            <div className="space-y-6">
                                <ContactItem icon={<Phone />} label="Phone Number" value={applicant.phone} />
                                <ContactItem icon={<Mail />} label="Email Address" value={applicant.email} />
                            </div>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 print:hidden">
                                        <MapPin size={24} className="text-white/60" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 print:text-black/40">Current Address</div>
                                        <p className="text-lg text-white/80 leading-relaxed font-normal print:text-sm print:text-black">{applicant.address}</p>
                                        <p className="text-xs text-white/30 mt-3 italic print:text-[10px] print:text-black/30 text-balance">อาศัยอยู่มา: {applicant.livingDuration || "-"} ปี ({applicant.residenceType || "-"})</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Education */}
                    <div className="glass rounded-3xl p-10 space-y-8 border border-white/10 print:border print:rounded-none print:p-4 print:bg-white shadow-xl">
                        <SectionTitle icon={<GraduationCap />} title="Education History" />
                        <div className="grid grid-cols-1 gap-4">
                            {applicant.educations.map((edu) => (
                                <div key={edu.id} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 print:bg-none print:border print:p-2 print:border-black/10">
                                    <div>
                                        <div className="text-sm font-black text-primary/80 uppercase tracking-widest print:text-xs">{edu.level}</div>
                                        <div className="text-2xl font-bold text-white print:text-base print:text-black">{edu.institution}</div>
                                        <div className="text-lg text-white/60 print:text-xs print:text-black/60">{edu.major || "-"}</div>
                                    </div>
                                    <div className="text-right print:text-left">
                                        <div className="text-xs font-bold text-white/40 uppercase tracking-widest">Graduated</div>
                                        <div className="text-2xl font-black text-white print:text-base print:text-black">{edu.graduatedYear || "-"}</div>
                                        <div className="text-sm text-white/30 print:text-[10px]">GPA: {edu.gpa?.toString() || "-"}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Experience */}
                    <div className="glass rounded-3xl p-10 space-y-8 border border-white/10 print:border print:rounded-none print:p-4 shadow-xl">
                        <SectionTitle icon={<Briefcase />} title="Work Experience" />
                        <div className="space-y-10 relative ml-6 border-l-2 border-white/10 pl-10 print:ml-4 print:pl-6 print:space-y-4">
                            {applicant.experiences.map((exp) => (
                                <div key={exp.id} className="relative">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[51px] top-2 h-5 w-5 rounded-full bg-primary border-4 border-black print:-left-[31px] print:h-3 print:w-3" />

                                    <div className="space-y-2">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                                            <h4 className="text-2xl font-bold text-white print:text-base print:text-black">{exp.position}</h4>
                                            <span className="hidden md:inline text-white/20 print:hidden">|</span>
                                            <span className="text-primary/70 font-bold uppercase text-sm tracking-widest print:text-xs">{exp.company}</span>
                                        </div>
                                        <div className="text-sm text-white/40 font-medium print:text-[10px]">
                                            {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : "PRESENT"}
                                        </div>
                                        {exp.reasonForLeaving && (
                                            <p className="mt-4 text-base text-white/60 font-light italic bg-black/20 p-4 rounded-2xl border border-white/5 print:bg-none print:p-1 print:border-none print:text-xs">
                                                Reason for leaving: {exp.reasonForLeaving}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Status & Sidebar (4 cols) */}
                <div className="lg:col-span-4 space-y-8 print:w-full print:mt-4">
                    {/* Job Details Sidebar */}
                    <div className="glass rounded-3xl p-10 space-y-10 border border-white/10 sticky top-8 print:static print:border print:rounded-none print:p-4 shadow-2xl">
                        <SectionTitle icon={<Clock />} title="Application Status" />

                        <div className="space-y-10">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-6 print:bg-none print:border-none print:p-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Expected Salary</span>
                                    <span className="text-3xl font-black text-white flex items-center gap-1 print:text-xl print:text-black/80">
                                        {applicant.expectedSalary?.toString() || "-"}
                                        <span className="text-sm font-normal text-white/40">THB</span>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Ready to Start</span>
                                    <span className="text-lg font-bold text-white print:text-black">{formatDate(applicant.startDate)}</span>
                                </div>
                            </div>

                            {/* Skills Tag Cloud */}
                            <div className="space-y-6">
                                <div className="text-xs font-black uppercase tracking-widest text-white/40">Skills & Assets</div>
                                {renderSkills(applicant.skills)}
                            </div>

                            {/* Attached Documents */}
                            <div className="space-y-6 print:hidden">
                                <div className="text-xs font-black uppercase tracking-widest text-white/40">Attached Files</div>
                                <div className="space-y-3">
                                    {applicant.resumePath && (
                                        <a href={applicant.resumePath} target="_blank" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <FileText size={24} className="text-primary" />
                                                <span className="text-base font-bold text-white">RESUME / CV</span>
                                            </div>
                                            <Download size={20} className="text-white/20 group-hover:text-white transition-colors" />
                                        </a>
                                    )}
                                    {renderDocuments(applicant.documents)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div >
    )
}

function renderSkills(skillsJson: string | null) {
    if (!skillsJson) return <p className="text-xs text-white/20 italic text-center">No skills data</p>
    try {
        const skills = JSON.parse(skillsJson)
        return (
            <div className="space-y-6">
                {/* Languages */}
                {skills.languages && skills.languages.length > 0 && (
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Languages</div>
                        <div className="grid grid-cols-1 gap-3">
                            {skills.languages.map((l: any, i: number) => (
                                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-white/80 print:bg-none print:border print:p-2 border-black/10">
                                    <div className="font-black text-primary mb-2 uppercase tracking-widest">{l.language}</div>
                                    <div className="grid grid-cols-3 gap-4 opacity-70 font-bold">
                                        <span>Read: {l.reading}</span>
                                        <span>Write: {l.writing}</span>
                                        <span>Speak: {l.speaking}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Computer */}
                {skills.computer && (
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Computer & Software</div>
                        <p className="text-base text-white/70 leading-relaxed font-normal bg-black/20 p-5 rounded-2xl border border-white/5 print:bg-none print:p-0 print:border-none print:text-xs print:text-black">
                            {skills.computer}
                        </p>
                    </div>
                )}

                {/* Others */}
                <div className="flex flex-wrap gap-3 pt-2">
                    {skills.drivingLicense && (
                        <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-black uppercase tracking-widest text-emerald-400 print:text-black print:border-black/20">
                            Driving License
                        </span>
                    )}
                    {skills.ownCar && (
                        <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-black uppercase tracking-widest text-blue-400 print:text-black print:border-black/20">
                            Personal Vehicle
                        </span>
                    )}
                </div>
            </div>
        )
    } catch {
        return <p className="text-base text-white/40 leading-relaxed font-normal">{skillsJson}</p>
    }
}

function renderDocuments(docsJson: string | null) {
    if (!docsJson) return null
    try {
        const docs = JSON.parse(docsJson)
        if (Array.isArray(docs)) {
            const labels: Record<string, string> = {
                'id_card': 'ID Card / บัตรประชาชน',
                'transcript': 'Academic Transcript / ทรานสคริปต์',
                'resume': 'Resume / CV',
                'house_reg': 'House Registration / ทะเบียนบ้าน'
            }
            return docs.map(doc => (
                <div key={doc} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-white/60 uppercase tracking-widest">{labels[doc] || doc}</span>
                </div>
            ))
        }
    } catch {
        return null
    }
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode, label: string, value: string | null | undefined }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-white/30 print:text-black/40">
                {icon}
                {label}
            </div>
            <div className="text-xl font-bold text-white print:text-sm print:text-black">{value || "-"}</div>
        </div>
    )
}

function ContactItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null | undefined }) {
    return (
        <div className="flex gap-5">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 print:hidden">
                <span className="text-white/60">{icon}</span>
            </div>
            <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 print:text-black/40">{label}</div>
                <div className="text-xl font-bold text-white print:text-base print:text-black">{value || "-"}</div>
            </div>
        </div>
    )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode, title: string }) {
    return (
        <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-xl text-primary print:hidden">
                {icon}
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] print:text-lg print:text-black print:tracking-widest">{title}</h3>
        </div>
    )
}
