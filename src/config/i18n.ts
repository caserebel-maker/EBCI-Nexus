export type Locale = 'th' | 'en'

// Dictionary Type Definition ensures type safety across languages
export type Dictionary = typeof th

export const th = {
    common: {
        required_field: "กรุณาระบุข้อมูล",
        save: "บันทึก",
        submit: "ส่งใบสมัคร",
        cancel: "ยกเลิก",
        next: "ถัดไป",
        back: "ย้อนกลับ",
        loading: "กำลังโหลด...",
        processing: "กำลังดำเนินการ...",
        success_title: "สำเร็จ",
        error_title: "เกิดข้อผิดพลาด",
        confirm_action: "ยืนยันการดำเนินการ",
        drag_drop_file: "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลด",
        file_type_hint: "รองรับ PDF, JPG, PNG",
    },
    career: {
        title: "ใบสมัครงาน",
        subtitle: "Job Application",
        step_1: "ตำแหน่ง & ประวัติ",
        step_2: "ที่อยู่ & ครอบครัว",
        step_3: "การศึกษา & ประสบการณ์",
        step_4: "ทักษะ & เอกสาร",
        step_5: "ตรวจสอบ",

        // Form Labels
        position_label: "ตำแหน่งที่สมัคร",
        salary_label: "เงินเดือนที่ต้องการ",
        start_date_label: "วันที่เริ่มงานได้",
        firstname_label: "ชื่อ (ภาษาไทย)",
        lastname_label: "นามสกุล (ภาษาไทย)",
        nickname_label: "ชื่อเล่น",
        dob_label: "วันเกิด",
        age_label: "อายุ (ปี)",
        nationality_label: "สัญชาติ",

        address_label: "ที่อยู่ปัจจุบัน",
        phone_label: "เบอร์โทรศัพท์",
        email_label: "อีเมล",
        military_label: "สถานะทางทหาร",
        marital_label: "สถานภาพสมรส",

        edu_level: "ระดับการศึกษา",
        edu_institute: "สถาบัน",
        edu_year: "ปีที่จบ",
        edu_gpa: "เกรดเฉลี่ย",
        add_edu: "เพิ่มข้อมูลการศึกษา",
        no_edu: "ยังไม่มีข้อมูลการศึกษา",

        exp_company: "บริษัท",
        exp_position: "ตำแหน่ง",
        exp_salary: "เงินเดือน",
        exp_reason: "สาเหตุที่ออก",
        add_exp: "เพิ่มประสบการณ์ทำงาน",
        no_exp: "ยังไม่มีข้อมูลประสบการณ์ทำงาน",

        skill_lang: "ความสามารถทางภาษา",
        skill_comp: "ความสามารถคอมพิวเตอร์",
        upload_photo: "รูปถ่ายหน้าตรง",
        upload_resume: "Resume / CV (PDF)",

        review_title: "สรุปข้อมูลการสมัคร",
        consent_disclaimer: "ข้าพเจ้าขอรับรองว่าข้อความที่กล่าวไว้ข้างต้นทั้งหมดนี้ เป็นความจริงทุกประการ...",

        success_msg: "บันทึกใบสมัครเรียบร้อยแล้ว",
        success_desc: "ทางฝ่ายบุคคลจะพิจารณาคุณสมบัติและติดต่อกลับโดยเร็วที่สุด",
        apply_more: "ส่งใบสมัครเพิ่ม",
        back_home: "กลับหน้าหลัก",
    }
}

export const en = {
    common: {
        required_field: "Required",
        save: "Save",
        submit: "Submit Application",
        cancel: "Cancel",
        next: "Next",
        back: "Back",
        loading: "Loading...",
        processing: "Processing...",
        success_title: "Success",
        error_title: "Error",
        confirm_action: "Confirm Action",
        drag_drop_file: "Drag & drop files here, or click to upload",
        file_type_hint: "Supports PDF, JPG, PNG",
    },
    career: {
        title: "Job Application",
        subtitle: "Job Application",
        step_1: "Position & Personal",
        step_2: "Address & Family",
        step_3: "Education & Exp.",
        step_4: "Skills & Docs",
        step_5: "Review",

        position_label: "Position Applied",
        salary_label: "Expected Salary",
        start_date_label: "Start Date",
        firstname_label: "First Name (Thai)",
        lastname_label: "Last Name (Thai)",
        nickname_label: "Nickname",
        dob_label: "Date of Birth",
        age_label: "Age (Years)",
        nationality_label: "Nationality",

        address_label: "Current Address",
        phone_label: "Phone Number",
        email_label: "Email",
        military_label: "Military Status",
        marital_label: "Marital Status",

        edu_level: "Level",
        edu_institute: "Institution",
        edu_year: "Graduation Year",
        edu_gpa: "GPA",
        add_edu: "Add Education",
        no_edu: "No education added",

        exp_company: "Company",
        exp_position: "Position",
        exp_salary: "Salary",
        exp_reason: "Reason for Leaving",
        add_exp: "Add Experience",
        no_exp: "No experience added",

        skill_lang: "Language Skills",
        skill_comp: "Computer Skills",
        upload_photo: "Recent Photo",
        upload_resume: "Resume / CV (PDF)",

        review_title: "Application Summary",
        consent_disclaimer: "I certify that all information provided above is true...",

        success_msg: "Application Submitted Successfully",
        success_desc: "HR team will review your application and contact you shortly.",
        apply_more: "Apply Another",
        back_home: "Back to Home",
    }
}

export const dictionaries = { th, en }

// Simple hook/helper simulation
export const getDictionary = (locale: Locale = 'th') => dictionaries[locale]
