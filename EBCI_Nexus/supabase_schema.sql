-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "name" TEXT,
    "biometric_id" TEXT,
    "fingerprint_data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "title" TEXT,
    "first_name_th" TEXT NOT NULL,
    "last_name_th" TEXT NOT NULL,
    "first_name_en" TEXT,
    "last_name_en" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "employment_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "user_id" TEXT,
    "applicant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" SERIAL NOT NULL,
    "fullname_th" TEXT,
    "position_applied" TEXT,
    "salary_expected" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "photo_file" TEXT,
    "resume_file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicants" (
    "id" TEXT NOT NULL,
    "position_applied" TEXT NOT NULL,
    "expected_salary" DECIMAL(65,30),
    "start_date" TIMESTAMP(3),
    "employment_status" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "nickname" TEXT,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT,
    "nationality" TEXT,
    "religion" TEXT,
    "race" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "current_address" TEXT NOT NULL,
    "residence_type" TEXT,
    "living_duration" INTEGER,
    "marital_status" TEXT,
    "military_status" TEXT,
    "children_count" INTEGER NOT NULL DEFAULT 0,
    "skills_json" TEXT,
    "documents_json" TEXT,
    "photo_path" TEXT,
    "resume_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicant_educations" (
    "id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "major" TEXT,
    "graduated_year" INTEGER,
    "gpa" DECIMAL(65,30),

    CONSTRAINT "applicant_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicant_experiences" (
    "id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "salary" DECIMAL(65,30),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "reason_for_leaving" TEXT,

    CONSTRAINT "applicant_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_path" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'internal',
    "publishStatus" TEXT NOT NULL DEFAULT 'draft',
    "publish_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clock_in" TIMESTAMP(3),
    "clock_out" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'present',
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_biometric_id_key" ON "User"("biometric_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_applicant_id_key" ON "employees"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");

-- CreateIndex
CREATE INDEX "applicant_educations_applicant_id_idx" ON "applicant_educations"("applicant_id");

-- CreateIndex
CREATE INDEX "applicant_experiences_applicant_id_idx" ON "applicant_experiences"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_employee_id_date_key" ON "attendance_logs"("employee_id", "date");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_educations" ADD CONSTRAINT "applicant_educations_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_experiences" ADD CONSTRAINT "applicant_experiences_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed Data (Admin User)
INSERT INTO "User" ("id", "username", "password", "role", "name", "createdAt", "updatedAt")
VALUES ('cm6ml6x8n000008l43y9z3y9z', 'admin', '0000', 'hr_admin', 'System Admin', NOW(), NOW())
ON CONFLICT ("username") DO NOTHING;
