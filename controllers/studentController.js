const db = require("../config/db");

function getWeekday(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) return null;
  return (parsedDate.getUTCDay() + 6) % 7;
}

function getWeekStart(date, weekday) {
  const weekStart = new Date(`${date}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekday);
  return weekStart.toISOString().slice(0, 10);
}

async function getStudentProfile(userId) {
  const studentRows = await db`
    SELECT * FROM students WHERE user_id = ${userId}
  `;

  return studentRows[0] || null;
}

async function getDashboard(req, res) {
  try {
    const student = await getStudentProfile(req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found"
      });
    }

    const summaryRows = await db`
      SELECT COUNT(ar.id) AS total_records,
             COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS present_count,
             COUNT(ar.id) FILTER (WHERE ar.status = 'Absent') AS absent_count
      FROM attendance_records ar
      JOIN attendance_sessions s ON s.id = ar.session_id
      WHERE ar.student_id = ${student.id}
    `;

    const overall = summaryRows[0];
    const total = Number(overall.total_records || 0);
    const present = Number(overall.present_count || 0);
    const absent = Number(overall.absent_count || 0);
    const percentage = total > 0 ? (present / total) * 100 : 0;

    const subjectRows = await db`
      SELECT s.subject_name,
             COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS present_count,
             COUNT(ar.id) FILTER (WHERE ar.status = 'Absent') AS absent_count,
             COUNT(ar.id) AS total_records
      FROM subjects s
      JOIN (
        SELECT DISTINCT cs.subject_id
        FROM class_schedules cs
        JOIN classes c ON c.id = cs.class_id
        WHERE cs.section = ${student.section} AND c.section = ${student.section}
          AND cs.active = TRUE AND cs.attendance_enabled = TRUE
          AND (cs.effective_from IS NULL OR cs.effective_from <= CURRENT_DATE)
      ) assigned_subjects ON assigned_subjects.subject_id = s.id
      LEFT JOIN attendance_sessions sess ON sess.subject_id = s.id
      LEFT JOIN attendance_records ar ON ar.session_id = sess.id AND ar.student_id = ${student.id}
      GROUP BY s.id, s.subject_name
      ORDER BY s.subject_name
    `;

    const recentRows = await db`
      SELECT TO_CHAR(sess.attendance_date, 'YYYY-MM-DD') AS attendance_date,
              s.subject_name,
              f.name AS faculty_name,
              ar.status,
              sess.session_type,
              sess.duration_hours
       FROM attendance_records ar
       JOIN attendance_sessions sess ON sess.id = ar.session_id
       JOIN subjects s ON s.id = sess.subject_id
       JOIN faculty f ON f.id = sess.faculty_id
       WHERE ar.student_id = ${student.id}
       ORDER BY sess.attendance_date DESC, s.subject_name ASC
       LIMIT 10
     `;

    return res.json({
      success: true,
      data: {
        student,
        summary: {
          total_records: total,
          present_count: present,
          absent_count: absent,
          attendance_percentage: Number(percentage.toFixed(2))
        },
        subjectSummary: subjectRows.map((row) => ({
          subject_name: row.subject_name,
          present_count: Number(row.present_count || 0),
          absent_count: Number(row.absent_count || 0),
          total_records: Number(row.total_records || 0),
          attendance_percentage: Number(row.total_records ? ((Number(row.present_count || 0) / row.total_records) * 100).toFixed(2) : 0)
        })),
        recentRecords: recentRows
      }
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load student dashboard"
    });
  }
}

async function getAttendanceSummary(req, res) {
  const student = await getStudentProfile(req.user.id);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student profile not found"
    });
  }

  const rows = await db`
    SELECT s.subject_name,
           COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS present_count,
           COUNT(ar.id) FILTER (WHERE ar.status = 'Absent') AS absent_count,
           COUNT(ar.id) AS total_records
    FROM subjects s
    JOIN (
      SELECT DISTINCT cs.subject_id
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.section = ${student.section} AND c.section = ${student.section}
        AND cs.active = TRUE AND cs.attendance_enabled = TRUE
        AND (cs.effective_from IS NULL OR cs.effective_from <= CURRENT_DATE)
    ) assigned_subjects ON assigned_subjects.subject_id = s.id
    LEFT JOIN attendance_sessions sess ON sess.subject_id = s.id
    LEFT JOIN attendance_records ar ON ar.session_id = sess.id AND ar.student_id = ${student.id}
    GROUP BY s.id, s.subject_name
    ORDER BY s.subject_name
  `;

  return res.json({
    success: true,
    data: rows.map((row) => ({
      subject_name: row.subject_name,
      present_count: Number(row.present_count || 0),
      absent_count: Number(row.absent_count || 0),
      total_records: Number(row.total_records || 0),
      attendance_percentage: Number(row.total_records ? ((Number(row.present_count || 0) / row.total_records) * 100).toFixed(2) : 0)
    }))
  });
}

async function getAttendanceHistory(req, res) {
  const student = await getStudentProfile(req.user.id);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student profile not found"
    });
  }

  const { subjectId, date } = req.query;
  const selectedSubjectId = subjectId ? Number(subjectId) : null;
  if (subjectId && (!Number.isInteger(selectedSubjectId) || selectedSubjectId <= 0)) {
    return res.status(400).json({ success: false, message: "Invalid subject ID" });
  }

  const rows = await db`
    SELECT TO_CHAR(sess.attendance_date, 'YYYY-MM-DD') AS attendance_date,
            s.subject_name, f.name AS faculty_name, ar.status,
        sess.session_type, sess.duration_hours, cs.start_time, cs.end_time
     FROM attendance_records ar
     JOIN attendance_sessions sess ON sess.id = ar.session_id
     JOIN subjects s ON s.id = sess.subject_id
     JOIN faculty f ON f.id = sess.faculty_id
     LEFT JOIN class_schedules cs ON cs.id = sess.schedule_id
     WHERE ar.student_id = ${student.id}
       AND (${selectedSubjectId}::integer IS NULL OR sess.subject_id = ${selectedSubjectId})
       AND (${date ?? null}::date IS NULL OR sess.attendance_date = ${date ?? null}::date)
     ORDER BY sess.attendance_date DESC, s.subject_name ASC
  `;

  return res.json({
    success: true,
    data: rows
  });
}

async function getSchedule(req, res) {
  const { date } = req.query;
  const weekday = getWeekday(date);

  if (weekday === null) {
    return res.status(400).json({ success: false, message: "A valid schedule date is required." });
  }

  const student = await getStudentProfile(req.user.id);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student profile not found" });
  }

  try {
    const rows = await db`
      SELECT TO_CHAR(${date}::date, 'YYYY-MM-DD') AS schedule_date,
              TRIM(TO_CHAR(${date}::date, 'Day')) AS day_name, cs.day_of_week,
              c.class_name, c.academic_year, cs.section, s.subject_code, s.subject_name,
              f.name AS faculty_name, cs.start_time, cs.end_time,
              cs.session_type, cs.duration_hours, cs.room,
              cs.attendance_enabled, cs.effective_from, cs.source_note
       FROM class_schedules cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id
       JOIN faculty f ON f.id = cs.faculty_id
       WHERE cs.section = ${student.section} AND cs.day_of_week = ${weekday}
         AND c.class_name = 'Information Technology (IT)' AND c.academic_year = '2026-27'
         AND cs.active = TRUE
         AND (cs.effective_from IS NULL OR cs.effective_from <= ${date}::date)
       ORDER BY cs.start_time, s.subject_name
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Student schedule error:", error);
    return res.status(500).json({ success: false, message: "Unable to load student schedule" });
  }
}

async function getWeeklySchedule(req, res) {
  const { date } = req.query;
  const weekday = getWeekday(date);

  if (weekday === null) {
    return res.status(400).json({ success: false, message: "A valid schedule date is required." });
  }

  const student = await getStudentProfile(req.user.id);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student profile not found" });
  }

  try {
    const weekStart = getWeekStart(date, weekday);
    const rows = await db`
      SELECT cs.day_of_week,
              TO_CHAR(${weekStart}::date + cs.day_of_week, 'YYYY-MM-DD') AS schedule_date,
              TRIM(TO_CHAR(${weekStart}::date + cs.day_of_week, 'Day')) AS day_name,
              c.class_name, c.academic_year, cs.section,
              s.subject_code, s.subject_name, f.name AS faculty_name,
              cs.start_time, cs.end_time, cs.session_type, cs.duration_hours,
              cs.room, cs.attendance_enabled, cs.effective_from, cs.source_note
       FROM class_schedules cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id
       JOIN faculty f ON f.id = cs.faculty_id
      WHERE cs.section = ${student.section}
         AND c.class_name = 'Information Technology (IT)' AND c.academic_year = '2026-27'
         AND cs.active = TRUE
         AND (cs.effective_from IS NULL OR cs.effective_from <= (${weekStart}::date + cs.day_of_week))
       ORDER BY cs.day_of_week, cs.start_time, s.subject_name
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Student weekly schedule error:", error);
    return res.status(500).json({ success: false, message: "Unable to load weekly schedule" });
  }
}

module.exports = {
  getDashboard,
  getAttendanceSummary,
  getAttendanceHistory,
  getSchedule,
  getWeeklySchedule
};
