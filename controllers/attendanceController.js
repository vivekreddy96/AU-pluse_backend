const db = require("../config/db");

function getWeekday(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) return null;
  return (parsedDate.getUTCDay() + 6) % 7;
}

async function getFacultyProfile(userId) {
  const facultyRows = await db`
    SELECT * FROM faculty WHERE user_id = ${userId}
  `;

  return facultyRows[0] || null;
}

async function getClassRecord(className, section) {
  const classRows = await db`
    SELECT * FROM classes
    WHERE class_name = ${className} AND section = ${section} AND academic_year = '2026-27'
    ORDER BY id
    LIMIT 1
  `;

  return classRows[0] || null;
}

async function getSavedSession(scheduleId, date) {
  const sessionRows = await db`
    SELECT s.id, s.class_id, s.subject_id, s.schedule_id, s.section,
           TO_CHAR(s.attendance_date, 'YYYY-MM-DD') AS attendance_date,
           s.session_type, s.duration_hours, c.class_name, sub.subject_name
    FROM attendance_sessions s
    JOIN classes c ON c.id = s.class_id
    JOIN subjects sub ON sub.id = s.subject_id
    WHERE s.schedule_id = ${scheduleId}
      AND s.attendance_date = ${date}::date
    LIMIT 1
  `;

  if (!sessionRows.length) return null;

  const session = sessionRows[0];
  const records = await db`
    SELECT ar.id AS record_id, st.id AS student_id, st.roll_no, st.name, ar.status
    FROM attendance_records ar
    JOIN students st ON st.id = ar.student_id
    WHERE ar.session_id = ${session.id}
      AND st.section = ${session.section}
    ORDER BY st.roll_no, st.name
  `;

  return {
    sessionId: session.id,
    classId: session.class_id,
    className: session.class_name,
    section: session.section,
    subjectId: session.subject_id,
    subjectName: session.subject_name,
    scheduleId: session.schedule_id,
    date: session.attendance_date,
    sessionType: session.session_type,
    durationHours: Number(session.duration_hours),
    recordsCount: records.length,
    records: records.map((record) => ({
      recordId: record.record_id,
      studentId: record.student_id,
      rollNo: record.roll_no,
      name: record.name,
      status: record.status
    }))
  };
}

async function validateFacultyAssignment(facultyId, classId, section, subjectId) {
  const rows = await db`
    SELECT fa.id, c.class_name, c.section, s.subject_name
    FROM faculty_assignments fa
    JOIN classes c ON c.id = fa.class_id
    JOIN subjects s ON s.id = fa.subject_id
    WHERE fa.faculty_id = ${facultyId}
      AND fa.class_id = ${classId}
      AND c.section = ${section}
      AND fa.section = ${section}
      AND fa.subject_id = ${subjectId}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function saveAttendance(req, res) {
  const {
    className,
    section,
    subjectId,
    scheduleId,
    date,
    records
  } = req.body;
  const weekday = getWeekday(date);

  if (!className || !section || !subjectId || !scheduleId || weekday === null || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      message: "A scheduled class, section, subject, date, and attendance roster are required"
    });
  }

  const studentIds = records.map((record) => Number(record?.studentId));
  if (studentIds.some((studentId) => !Number.isInteger(studentId) || studentId <= 0)
    || new Set(studentIds).size !== studentIds.length
    || records.some((record) => !["Present", "Absent"].includes(record?.status))) {
    return res.status(400).json({
      success: false,
      message: "Attendance records must contain unique students and valid statuses."
    });
  }

  try {
    const facultyProfile = await getFacultyProfile(req.user.id);

    if (!facultyProfile) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found"
      });
    }

    const subjectIdNumber = Number(subjectId);
    const classRecord = await getClassRecord(className, section);

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: "The selected class and section were not found."
      });
    }

    const assignment = await validateFacultyAssignment(
      facultyProfile.id,
      classRecord.id,
      section,
      subjectIdNumber
    );

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to mark attendance for this class and subject."
      });
    }

    const sectionStudents = await db`
      SELECT id FROM students WHERE section = ${section}
    `;
    const assignedStudentIds = new Set(sectionStudents.map((student) => Number(student.id)));

    if (sectionStudents.length !== studentIds.length || studentIds.some((studentId) => !assignedStudentIds.has(studentId))) {
      return res.status(400).json({
        success: false,
        message: "Attendance must include every student in the assigned section and no other students."
      });
    }

    const scheduleRows = await db`
      SELECT cs.id, cs.session_type, cs.duration_hours, cs.attendance_enabled
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = ${Number(scheduleId)}
        AND cs.class_id = ${classRecord.id}
        AND cs.subject_id = ${subjectIdNumber}
        AND cs.faculty_id = ${facultyProfile.id}
        AND cs.section = ${section}
        AND cs.day_of_week = ${weekday}
        AND cs.active = TRUE
        AND c.academic_year = '2026-27'
        AND (cs.effective_from IS NULL OR cs.effective_from <= ${date}::date)
      LIMIT 1
    `;

    if (!scheduleRows.length) {
      return res.status(403).json({
        success: false,
        message: "The selected timetable slot is not assigned to you for this date."
      });
    }

    const schedule = scheduleRows[0];
    if (!schedule.attendance_enabled) {
      return res.status(403).json({
        success: false,
        message: "Attendance is not enabled for this timetable activity."
      });
    }

    const sessionType = schedule.session_type === "Lab" ? "Practical" : "Theory";
    const durationHours = Number(schedule.duration_hours);

    const normalizedType = sessionType;
    const normalizedDuration = durationHours;

    const existingSession = await getSavedSession(schedule.id, date);
    if (existingSession) {
      return res.json({
        success: true,
        message: "Attendance session already exists; saved records were returned.",
        data: existingSession
      });
    }

    const attendancePayload = JSON.stringify(records.map((record) => ({
      student_id: Number(record.studentId),
      status: record.status
    })));
    const insertSessionResult = await db`
      WITH created_session AS (
        INSERT INTO attendance_sessions
        (class_id, subject_id, faculty_id, schedule_id, section, attendance_date, session_type, duration_hours)
        VALUES
          (${classRecord.id}, ${subjectIdNumber}, ${facultyProfile.id}, ${schedule.id}, ${section}, ${date}::date, ${normalizedType}, ${normalizedDuration})
        ON CONFLICT (schedule_id, attendance_date)
          WHERE schedule_id IS NOT NULL
        DO NOTHING
        RETURNING id
      ), inserted_records AS (
        INSERT INTO attendance_records (session_id, student_id, status)
        SELECT created_session.id, input.student_id, input.status
        FROM created_session
        CROSS JOIN jsonb_to_recordset(${attendancePayload}::jsonb) AS input(student_id integer, status text)
        RETURNING id
      )
      SELECT id FROM created_session
    `;

    if (!insertSessionResult.length) {
      const savedSession = await getSavedSession(schedule.id, date);
      return res.json({
        success: true,
        message: "Attendance session already exists; saved records were returned.",
        data: savedSession
      });
    }

    const savedSession = await getSavedSession(schedule.id, date);
    return res.status(201).json({
      success: true,
      message: "Attendance saved successfully",
      data: savedSession
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This attendance session already exists."
      });
    }

    console.error("Save attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save attendance"
    });
  }
}

async function getSessionDetails(req, res) {
  const sessionId = Number(req.params.id);

  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Invalid session ID" });
  }

  try {
    const facultyProfile = await getFacultyProfile(req.user.id);

    if (!facultyProfile) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const sessionRows = await db`
      SELECT s.id, s.schedule_id, TO_CHAR(s.attendance_date, 'YYYY-MM-DD') AS attendance_date,
             s.session_type, s.duration_hours, s.section, s.created_at, s.updated_at,
             cs.start_time, cs.end_time, cs.room,
             c.class_name, sub.subject_name, sub.id AS subject_id
      FROM attendance_sessions s
      JOIN classes c ON c.id = s.class_id
      JOIN subjects sub ON sub.id = s.subject_id
      JOIN class_schedules cs ON cs.id = s.schedule_id
      WHERE s.id = ${sessionId}
        AND cs.faculty_id = ${facultyProfile.id}
        AND cs.section = s.section
        AND cs.active = TRUE
        AND cs.attendance_enabled = TRUE
      LIMIT 1
    `;

    if (!sessionRows.length) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this attendance session."
      });
    }

    const session = sessionRows[0];
    const recordsRows = await db`
      SELECT ar.id AS record_id, st.id AS student_id, st.roll_no, st.name, ar.status
      FROM attendance_records ar
      JOIN students st ON st.id = ar.student_id
      WHERE ar.session_id = ${sessionId}
        AND st.section = ${session.section}
      ORDER BY st.roll_no ASC, st.name ASC
    `;
    const auditRows = await db`
      SELECT aa.record_id, st.roll_no, aa.previous_status, aa.new_status,
             f.faculty_code, f.name AS faculty_name, u.username,
             aa.changed_at, aa.reason
      FROM attendance_audit aa
      JOIN attendance_records ar ON ar.id = aa.record_id
      JOIN students st ON st.id = ar.student_id
      JOIN faculty f ON f.id = aa.changed_by_faculty_id
      JOIN users u ON u.id = f.user_id
      WHERE ar.session_id = ${sessionId}
        AND st.section = ${session.section}
      ORDER BY aa.changed_at DESC, aa.id DESC
    `;

    return res.json({
      success: true,
      data: {
        session,
        records: recordsRows,
        audit: auditRows
      }
    });
  } catch (error) {
    console.error("getSessionDetails error:", error);
    return res.status(500).json({ success: false, message: "Unable to load attendance session" });
  }
}

async function updateSessionAttendance(req, res) {
  const sessionId = Number(req.params.id);
  const { records, reason = "Updated by faculty" } = req.body;

  if (!sessionId || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      message: "A valid session ID and student records are required."
    });
  }

  try {
    const facultyProfile = await getFacultyProfile(req.user.id);

    if (!facultyProfile) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const sessionRows = await db`
      SELECT s.id, s.section
      FROM attendance_sessions s
      JOIN class_schedules cs ON cs.id = s.schedule_id
      WHERE s.id = ${sessionId}
        AND cs.faculty_id = ${facultyProfile.id}
        AND cs.section = s.section
        AND cs.active = TRUE
        AND cs.attendance_enabled = TRUE
      LIMIT 1
    `;

    if (!sessionRows.length) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this attendance session."
      });
    }

    const recordIds = records.map((record) => Number(record?.recordId));
    const studentIds = records.map((record) => Number(record?.studentId));
    if (records.some((record) => !Number.isInteger(Number(record?.recordId))
      || Number(record.recordId) <= 0
      || !Number.isInteger(Number(record?.studentId))
      || Number(record.studentId) <= 0
      || !["Present", "Absent"].includes(record.status))
      || new Set(recordIds).size !== recordIds.length
      || new Set(studentIds).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Attendance updates must contain unique records, students, and valid statuses."
      });
    }

    const updates = [];

    for (const record of records) {
      const existingRow = await db`
        SELECT id, student_id, status
        FROM attendance_records
        WHERE id = ${record.recordId} AND session_id = ${sessionId}
          AND student_id IN (
            SELECT id FROM students WHERE section = ${sessionRows[0].section}
          )
        LIMIT 1
      `;

      if (!existingRow.length) {
        return res.status(404).json({
          success: false,
          message: "One or more attendance records could not be found."
        });
      }

      if (Number(record.studentId) !== Number(existingRow[0].student_id)
        || !["Present", "Absent"].includes(record.status)) {
        return res.status(400).json({
          success: false,
          message: "Attendance updates must match the original student and use a valid status."
        });
      }

      const previousStatus = existingRow[0].status;
      const nextStatus = record.status === "Absent" ? "Absent" : "Present";

      if (previousStatus !== nextStatus) {
        updates.push({
          recordId: existingRow[0].id,
          previousStatus,
          newStatus: nextStatus
        });
      }
    }

    if (updates.length > 0) {
      for (const update of updates) {
        await db`
          UPDATE attendance_records
          SET status = ${update.newStatus}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${update.recordId}
        `;

        await db`
          INSERT INTO attendance_audit
            (record_id, previous_status, new_status, changed_by_faculty_id, reason)
          VALUES
            (${update.recordId}, ${update.previousStatus}, ${update.newStatus}, ${facultyProfile.id}, ${reason})
        `;
      }
    }

    await db`
      UPDATE attendance_sessions SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${sessionId}
    `;

    return res.json({
      success: true,
      message: "Attendance changes saved successfully.",
      data: {
        sessionId,
        changedRecords: updates.length
      }
    });
  } catch (error) {
    console.error("Update session attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update attendance"
    });
  }
}

async function getAttendanceHistory(req, res) {
  try {
    const facultyProfile = await getFacultyProfile(req.user.id);

    if (!facultyProfile) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const { date, subjectId, className, section } = req.query;
    const selectedSubjectId = subjectId ? Number(subjectId) : null;
    const rows = await db`
      SELECT s.id AS session_id,
              TO_CHAR(s.attendance_date, 'YYYY-MM-DD') AS attendance_date,
              sub.subject_name,
              c.class_name,
              s.section,
              cs.start_time,
              cs.end_time,
              cs.room,
              s.session_type,
              s.duration_hours,
              COUNT(*) FILTER (WHERE ar.status = 'Present') AS present_count,
              COUNT(*) FILTER (WHERE ar.status = 'Absent') AS absent_count,
              s.created_at,
              s.updated_at
       FROM attendance_sessions s
       JOIN classes c ON c.id = s.class_id
       JOIN subjects sub ON sub.id = s.subject_id
      JOIN class_schedules cs ON cs.id = s.schedule_id
      LEFT JOIN attendance_records ar ON ar.session_id = s.id
      WHERE cs.faculty_id = ${facultyProfile.id}
        AND (${date ?? null}::date IS NULL OR s.attendance_date = ${date ?? null}::date)
        AND (${selectedSubjectId}::integer IS NULL OR s.subject_id = ${selectedSubjectId})
        AND (${section ?? null}::text IS NULL OR s.section = ${section ?? ""})
        AND (${className ?? null}::text IS NULL OR c.class_name = ${className ?? ""})
      GROUP BY s.id, s.attendance_date, sub.subject_name, c.class_name, s.section,
               cs.start_time, cs.end_time, cs.room, s.session_type, s.duration_hours,
               s.created_at, s.updated_at
      ORDER BY s.attendance_date DESC, sub.subject_name ASC
    `;

    return res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        present_count: Number(row.present_count || 0),
        absent_count: Number(row.absent_count || 0),
        duration_hours: Number(row.duration_hours || 0),
        session_type: row.session_type || "Theory"
      }))
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    return res.status(500).json({ success: false, message: "Unable to load attendance history" });
  }
}

module.exports = {
  saveAttendance,
  getSessionDetails,
  updateSessionAttendance,
  getAttendanceHistory
};
