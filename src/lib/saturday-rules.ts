// Company Saturday Work rules:
// - 1st Saturday: Office Workday (วันทำงานครึ่งวัน (ออฟฟิศ))
// - 2nd Saturday: Holiday (วันหยุดประจำสัปดาห์)
// - 3rd Saturday: WFH Workday (วันทำงานครึ่งวัน (WFH))
// - 4th Saturday: Holiday (วันหยุดประจำสัปดาห์)
// - 5th Saturday: Holiday (วันหยุดประจำสัปดาห์)

export interface SaturdayHoliday {
    id: string
    date: string
    name: string
    type: string
    year: number
}

export function getSaturdayIndex(dateInput: Date | string): number {
    const date = typeof dateInput === 'string' 
        ? new Date(dateInput + 'T00:00:00+07:00') 
        : dateInput;
    
    if (date.getDay() !== 6) return 0; // Not a Saturday
    
    return Math.ceil(date.getDate() / 7);
}

export function isWorkdaySaturday(dateInput: Date | string): boolean {
    const idx = getSaturdayIndex(dateInput);
    return idx === 1 || idx === 3;
}

export function isWfhSaturday(dateInput: Date | string): boolean {
    const idx = getSaturdayIndex(dateInput);
    return idx === 3;
}

export function isHolidaySaturday(dateInput: Date | string): boolean {
    const idx = getSaturdayIndex(dateInput);
    return idx === 2 || idx === 4 || idx === 5;
}

export function getSaturdaysForYear(year: number): SaturdayHoliday[] {
    const holidays: SaturdayHoliday[] = []
    
    for (let m = 0; m < 12; m++) {
        // Month is 0-indexed in JS Date
        const date = new Date(year, m, 1)
        let satCount = 0
        
        while (date.getMonth() === m) {
            if (date.getDay() === 6) { // Saturday
                satCount++
                const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                
                if (satCount === 1) {
                    holidays.push({
                        id: `sat-work-office-${dateStr}`,
                        date: dateStr,
                        name: 'วันทำงานครึ่งวัน (ออฟฟิศ)',
                        type: 'work',
                        year,
                    })
                } else if (satCount === 3) {
                    holidays.push({
                        id: `sat-wfh-${dateStr}`,
                        date: dateStr,
                        name: 'วันทำงานครึ่งวัน (WFH)',
                        type: 'wfh',
                        year,
                    })
                } else {
                    holidays.push({
                        id: `sat-holiday-${dateStr}`,
                        date: dateStr,
                        name: 'วันหยุดประจำสัปดาห์',
                        type: 'company',
                        year,
                    })
                }
            }
            date.setDate(date.getDate() + 1)
        }
    }
    
    return holidays
}

export function mergeHolidays(dbHolidays: any[], year: number): any[] {
    const generated = getSaturdaysForYear(year)
    const merged = [...dbHolidays]
    
    const existingMap = new Map<string, string>()
    for (const h of dbHolidays) {
        existingMap.set(h.date, h.type)
    }
    
    for (const gen of generated) {
        if (!existingMap.has(gen.date)) {
            merged.push(gen)
        }
    }
    
    return merged.sort((a, b) => a.date.localeCompare(b.date))
}
