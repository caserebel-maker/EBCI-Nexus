const DAILY_GREETINGS = [
    '💪 ชีวิตต้องสู้ เพราะกู้ไว้เยอะ 💪',
    '🎰 ถ้าถูกหวยในวันนั้น คงไม่ต้องขยันอย่างในวันนี้ 🎰',
    '😎 อย่าเครียดกับงานที่หัวหน้าสั่ง แต่ปล่อยให้หัวหน้าเครียดกับงานที่สั่งเรา 😎',
    '🍜 เป็นคนเที่ยงธรรม ถ้าไม่เที่ยงไม่ทำงาน 🍜',
    '💸 ถ้าเครียดเรื่องงานอย่าเพิ่งลาออก เพราะถ้าลาออกคุณจะเครียดเรื่องเงินด้วย 💸',
    '👻 ถึงร่างกายจะทำงาน แต่จิตวิญญาณกลับบ้านไปนานแล้ว 👻',
    '🧘 กายหยาบอยู่ออฟฟิศ กายทิพย์อยู่คลินิกกายภาพ 🧘',
    '💊 อนิจจัง ทุกขัง พารา ทุกปัญหา มียาแก้ปวดเสมอ 💊',
    '💔 เจ็บกว่าการอยู่ลำพัง คือการไม่มีตังค์อยู่ในบัญชี 💔',
    '😩 อยากหยุดงานสักปี แต่ดูเงินในบัญชี ทำงานต่อเถอะ 😩',
]

const PAYDAY_GREETINGS = [
    '💸 ชีวิตนี้ต้องสู้ เพราะกู้มาเยอะ 💸',
    '👑 เงินเดือนออกเมื่อไหร่ ความยิ่งใหญ่จะกลับมา 👑',
    '🥹 วันไหนเล่าจะสุขเท่าวันเงินเดือนออก 🥹',
    '🪄 ความเจ็บปวดทั้งหลายจะหายไปเมื่อเห็นยอดเงินเดือน 🪄',
    '✨ วินาทีที่เงินเดือนเข้า เราก็ไม่ใช่คนจนอีกต่อไป ✨',
    '🍜 เงินเดือนอาจจะอยู่กับเราถึงวันที่ 5 แต่มาม่าจะอยู่กับเราถึงสิ้นเดือน 🍜',
    '📄 เงินเดือนคือมายา บิลตรงหน้าคือของจริง 📄',
]

export function getGreeting(opts: {
    nickname?: string | null
    dateOfBirth?: string | null
}): string {
    const now = new Date()
    const today = { day: now.getDate(), month: now.getMonth() + 1 }

    if (opts.dateOfBirth) {
        const dob = new Date(opts.dateOfBirth)
        if (dob.getDate() === today.day && dob.getMonth() + 1 === today.month) {
            const name = opts.nickname?.trim() || 'คุณ'
            return `🎂 สุขสันต์วันเกิด ${name}! ขอให้ทุกความฝันเป็นจริงน้าาา 🎁`
        }
    }

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isLastDayOfMonth = tomorrow.getDate() === 1
    if (isLastDayOfMonth) {
        const idx = today.day % PAYDAY_GREETINGS.length
        return PAYDAY_GREETINGS[idx]
    }

    const start = new Date(now.getFullYear(), 0, 0)
    const diff = now.getTime() - start.getTime()
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
    return DAILY_GREETINGS[dayOfYear % DAILY_GREETINGS.length]
}
