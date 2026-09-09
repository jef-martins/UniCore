-- CreateEnum
CREATE TYPE "ClassroomRoomStatus" AS ENUM ('PENDING', 'PROCESSING', 'CREATED', 'CREATED_WITH_WARNINGS', 'FAILED');

-- CreateTable
CREATE TABLE "classroom_rooms" (
    "id" UUID NOT NULL,
    "academic_course_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "class_group" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "teacher_email" TEXT NOT NULL,
    "google_course_id" TEXT,
    "alternate_link" TEXT,
    "status" "ClassroomRoomStatus" NOT NULL DEFAULT 'PENDING',
    "last_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classroom_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classroom_rooms_google_course_id_key" ON "classroom_rooms"("google_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_rooms_academic_course_id_subject_id_class_group_semester_key" ON "classroom_rooms"("academic_course_id", "subject_id", "class_group", "semester");

-- CreateIndex
CREATE INDEX "classroom_rooms_semester_academic_course_id_idx" ON "classroom_rooms"("semester", "academic_course_id");
