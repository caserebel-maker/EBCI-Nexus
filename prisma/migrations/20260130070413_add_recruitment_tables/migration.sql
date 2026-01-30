-- CreateTable
CREATE TABLE "applicants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position_applied" TEXT NOT NULL,
    "expected_salary" DECIMAL,
    "start_date" DATETIME,
    "employment_status" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "nickname" TEXT,
    "date_of_birth" DATETIME NOT NULL,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "applicant_educations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicant_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "major" TEXT,
    "graduated_year" INTEGER,
    "gpa" DECIMAL,
    CONSTRAINT "applicant_educations_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "applicant_experiences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicant_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "salary" DECIMAL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "reason_for_leaving" TEXT,
    CONSTRAINT "applicant_experiences_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");

-- CreateIndex
CREATE INDEX "applicant_educations_applicant_id_idx" ON "applicant_educations"("applicant_id");

-- CreateIndex
CREATE INDEX "applicant_experiences_applicant_id_idx" ON "applicant_experiences"("applicant_id");
