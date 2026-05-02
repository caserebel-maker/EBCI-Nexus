# 📋 NEXT — Session Handoff (Living Doc)

> ⚠️ Always read this first when starting a Claude Code session

---

## 🔁 ที่เครื่องถัดไป (home Mac mini M2 Pro)

**ขั้นที่ 1 — sync ก่อน:**
```bash
cd ~/C1TB/EB-CI/EBCI-Nexus
git pull origin main --ff-only
```

**ขั้นที่ 2 — clone Flow repo (ครั้งแรกเท่านั้น):**
```bash
cd ~/C1TB/EB-CI
git clone git@github.com:caserebel-maker/EBCI-Flow-Prototype.git
# ถ้ามีอยู่แล้ว: cd EBCI-Flow-Prototype && git pull origin main
```

**ขั้นที่ 3 — เปิด Claude Code แล้วพิมพ์:**
```
อ่าน docs/NEXT.md แล้วทำต่อ — เริ่มที่ §3.1 (continue EBCI Flow prototype)
```

---

## §0 TL;DR (30 sec)

วันนี้ (2 พ.ค. 2026) — สร้าง **EBCI Flow prototype** เสร็จ + push ขึ้น GitHub แล้ว

- 🌐 Live: https://ebci-flow.vercel.app (staff) + https://ebci-flow.vercel.app/track (customer)
- 📦 Repo ใหม่: `caserebel-maker/EBCI-Flow-Prototype` (private)
- 🎨 Theme: **maroon gradient** ตรง Nexus brand แต่ใช้ light bg + white cards เพื่อ differentiate
- 📐 Tech: vanilla HTML/CSS/JS (prototype only — production จะเป็น Next.js + Supabase)

## §1 Commits ที่ shipped วันนี้

| Repo | Commit | Note |
|---|---|---|
| **EBCI-Flow-Prototype** (new) | `1cafe2e` | initial — staff workspace + customer tracking |
| EBCI-Nexus | this commit | update NEXT.md handoff |

## §2 ที่ live + ใช้งานได้ตอนนี้

### Customer-facing tracking — https://ebci-flow.vercel.app/track
- Landing search form (B/L + ชื่อบริษัท → fuzzy match + alias support)
- Tracking detail with red metric cards + status timeline
- Recent searches (localStorage, ลูกค้าไม่ต้อง login)
- Contact view (LINE/โทร/Email + เวลาทำการ)
- Help/FAQ view (6 คำถาม)
- **Sidebar (desktop) + Bottom nav (mobile)** — app-like UX
- Mobile gradient header (maroon)
- Lucide-style SVG icons ทุกที่
- ภาษาไทยทั้งหมด, Anuphan font

### Staff workspace demo — https://ebci-flow.vercel.app
- 8 modules: Dashboard, Shipment Desk, ESR Tracking, Reply Helper,
  AI Doc Processor, HS Code Lookup, Knowledge Base, Audit Log
- Deep Blue dark theme (ต่างจาก customer ตั้งใจ)

## §3 Priority list — ต่อไปทำอะไร

### §3.1 ⭐ ลองใน mobile + โชว์ MD (next session — ที่บ้าน)
- เปิด https://ebci-flow.vercel.app/track ใน iPhone ของพี่
- ดูว่า maroon gradient header + sidebar/bottom nav vibe โอเคมั้ย
- โชว์ MD + คุณจิม → เก็บ feedback (theme, naming, features)
- ตัดสินใจ: ผ่าน → migrate to production stack

### §3.2 ถ้า MD ผ่าน → migrate to production
1. Add `flow` schema to Nexus Supabase (schema-based separation, รักษา free tier)
2. Setup Cloudflare R2 for PDF storage (free 10GB + ไม่มี egress fee)
3. Migrate static HTML → **Next.js 16 + Tailwind** (โครงเดียวกับ Nexus)
4. SSO with Nexus (`nexus_session` cookie pattern)
5. AI: Gemini free tier ก่อน → Claude สำหรับ critical (HS Code, Doc Processor)
6. Beta test กับน้องครีม + พี่ตู่

### §3.3 Decision pending — ก่อน build จริง
- [ ] **Naming:** Flow ✓ หรือ Helm/Forge/Atlas? (ตอนนี้ชั่วคราว Flow)
- [ ] **Customer Portal full app** vs **tracking link only**? (เคยคุยกัน + EBCIREVO ก็เห็นด้วย start with public tracking)
- [ ] **Apply maroon theme กับ staff Flow ด้วยมั้ย?** (ตอนนี้ staff = Deep Blue, customer = Maroon)
- [ ] ESR self-service form ตามที่เพิ่มเข้าไป OK ไหม (มี B/L + ชื่อบริษัท verification)
- [ ] **# of apps:** 5 (ตาม EBCIREVO) vs 3 codebases + 2 features (ของผม) → discuss

### §3.4 จาก Master Brief เดิม — ที่ยังค้าง
- Workspace Sprint 1-2 (foundation: auth + layout + nav) — ยังไม่ได้เริ่ม
- ดู `EBCI_Master_Brief.md` ใน Downloads + `EBCIREVO.html` ใน Downloads
- ทั้ง 2 docs สอดคล้องกัน 80%, สรุปกันใน session นี้แล้ว

## §4 Env / Config / Test

| | Value |
|---|---|
| Nexus Supabase project | `cluirxjykhchthcpgosz` (kept as-is) |
| Vercel team | `team_EE8l0QHf5AlQg5klF8YhfpFJ` |
| Vercel projects (existing) | `ebci-nexus`, **`ebci-flow`** (new), `cctv-dashboard`, `connect-github-...` |
| Domain | `ebcinext.com` (subdomain `flow.ebcinext.com` ยังไม่ตั้ง — ถ้าจะ pitch กับ MD ค่อยเชื่อม) |
| Flow GitHub repo | `caserebel-maker/EBCI-Flow-Prototype` (private) |
| Flow live URLs | `ebci-flow.vercel.app` + `ebci-flow.vercel.app/track` |

## §5 Git state (end of session)

| Repo | Branch | Last commit | Pushed? |
|---|---|---|---|
| EBCI-Nexus | main | (this commit) | ✅ ก่อนปิด session |
| EBCI-Flow-Prototype | main | `1cafe2e` | ✅ pushed |

Worktree ที่ทำงาน: `claude/festive-euler-d97e16`

## §6 Quirks / lessons learned วันนี้

1. **Vercel Hobby plan** ใช้ commercial = TOS violation (low risk แต่ควรรู้, ฿700/mo Pro ถ้าโดน)
2. **Cloudflare R2 ดีกว่า Supabase Storage มาก** สำหรับ PDFs — 10GB ฟรี + ไม่มี egress fee → save Supabase Pro $25/mo
3. **ลูกค้า EBCI ส่วนใหญ่ legacy company** (ปูนซีเมนต์ 30 ราย) → Customer Portal full app อาจ overkill เมื่อเทียบกับ tracking link via LINE
4. **EBCIREVO 5 apps ≈ 3 codebases + 2 features ของผม** — เนื้อหาเหมือนกัน นับต่างกัน. ใช้ EBCIREVO pitch กับ MD, build เป็น 3 codebases จริง
5. **Naming consistency** — Nexus, Flow, Vault (accounting) — concrete nouns ทั้งหมด
6. **Glassmorphism vs Light theme** — user ชอบ light theme มากกว่า, ใช้ maroon gradient แต่เก็บ light bg + white cards เพื่อ differentiate จาก Nexus
7. **Mobile gradient header** = ใส่กลิ่น brand บน mobile โดยไม่ต้องเสียพื้นที่ sidebar
8. **SVG icons (Lucide)** ดีกว่า emoji เยอะ — scale ได้, สีตามเทมเพลต, ดูมืออาชีพ

---

## 📂 Path บนแต่ละเครื่อง

| Machine | Nexus path | Flow path |
|---|---|---|
| Office Mac mini M4 (`ebcimord`) | `/Volumes/1TB-NVME/2026/FEB26-EBCI/EBCI-Nexus-App` | `/Volumes/1TB-NVME/2026/FEB26-EBCI/EBCI-Flow-Prototype` (clone needed) |
| **Home Mac mini M2 Pro** | `~/C1TB/EB-CI/EBCI-Nexus` | `~/C1TB/EB-CI/EBCI-Flow-Prototype` (clone needed) |
| Laptop (in car) | varies | varies |

---

*Last updated: 2 พ.ค. 2026 ~20:15 — office (Mac mini M4) → going home*
