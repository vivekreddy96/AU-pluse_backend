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

async function getFacultyProfile(userId) {
  const facultyRows = await db`
    SELECT f.id, f.user_id, f.faculty_code, u.username, f.name, f.email
    FROM faculty f
    JOIN users u ON u.id = f.user_id
    WHERE f.user_id = ${userId}
  `;

  return facultyRows[0] || null;
}

async function getDashboard(req, res) {
  try {
    const faculty = await getFacultyProfile(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found"
      });
    }

    const classes = await db`
      SELECT DISTINCT c.class_name, c.section, c.academic_year
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.faculty_id = ${faculty.id}
        AND cs.active = TRUE
        AND c.academic_year = '2026-27'
        AND (cs.effective_from IS NULL OR cs.effective_from <= CURRENT_DATE)
      ORDER BY c.class_name, c.section
    `;

    const subjects = await db`
      SELECT DISTINCT s.*
      FROM class_schedules cs
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.faculty_id = ${faculty.id}
        AND cs.active = TRUE
        AND (cs.effective_from IS NULL OR cs.effective_from <= CURRENT_DATE)
      ORDER BY s.subject_name
    `;

    const recentRows = await db`
      SELECT TO_CHAR(s.attendance_date, 'YYYY-MM-DD') AS attendance_date,
              sub.subject_name,
              c.class_name,
              s.section,
              s.session_type,
              s.duration_hours,
              COUNT(*) FILTER (WHERE ar.status = 'Present') AS present_count,
              COUNT(*) FILTER (WHERE ar.status = 'Absent') AS absent_count
       FROM attendance_sessions s
      JOIN class_schedules cs ON cs.id = s.schedule_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN attendance_records ar ON ar.session_id = s.id
          WHERE cs.faculty_id = ${faculty.id}
       GROUP BY s.id, s.attendance_date, sub.subject_name, c.class_name, s.section, s.session_type, s.duration_hours
      ORDER BY s.attendance_date DESC, sub.subject_name ASC
      LIMIT 6
    `;

    const summaryRows = await db`
      SELECT COUNT(ar.id) AS total_records,
              COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS present_count,
              COUNT(ar.id) FILTER (WHERE ar.status = 'Absent') AS absent_count
       FROM attendance_sessions s
      JOIN class_schedules cs ON cs.id = s.schedule_id
       LEFT JOIN attendance_records ar ON ar.session_id = s.id
      WHERE cs.faculty_id = ${faculty.id}
    `;

    return res.json({
      success: true,
      data: {
        faculty,
        classes,
        subjects,
        recentRecords: recentRows,
        summary: summaryRows[0] || { total_records: 0, present_count: 0, absent_count: 0 }
      }
    });
  } catch (error) {
    console.error("Faculty dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load faculty dashboard"
    });
  }
}

async function getClasses(req, res) {
  try {
    const faculty = await getFacultyProfile(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found"
      });
    }

    const rows = await db`
      SELECT DISTINCT c.class_name, c.section, c.academic_year
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.faculty_id = ${faculty.id}
         AND cs.active = TRUE
         AND c.academic_year = '2026-27'
         AND (cs.effective_from IS NULL OR cs.effective_from <= CURRENT_DATE)
      ORDER BY c.class_name, c.section
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load classes" });
  }
}

async function getSections(req, res) {
  try {
    const rows = await db`
      SELECT DISTINCT section
      FROM classes
      WHERE class_name = 'Information Technology (IT)'
        AND academic_year = '2026-27'
      ORDER BY section
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load sections" });
  }
}

async function getSubjects(req, res) {
  try {
    const faculty = await getFacultyProfile(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found"
      });
    }

    const rows = await db`
      SELECT DISTINCT s.*
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.faculty_id = ${faculty.id}
        AND cs.active = TRUE
        AND c.academic_year = '2026-27'
        AND (cs.effective_from IS NULL OR cs.effective_from <= CURRENT_DATE)
      ORDER BY s.subject_name
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load subjects" });
  }
}

async function getSchedule(req, res) {
  const { date, section } = req.query;
  const weekday = getWeekday(date);

  if (weekday === null) {
    return res.status(400).json({ success: false, message: "A valid schedule date is required." });
  }

  try {
    const faculty = await getFacultyProfile(req.user.id);

    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const rows = await db`
      SELECT cs.id AS schedule_id,
              TO_CHAR(${date}::date, 'YYYY-MM-DD') AS schedule_date,
              TRIM(TO_CHAR(${date}::date, 'Day')) AS day_name,
              cs.day_of_week, c.id AS class_id, c.class_name, c.academic_year, cs.section,
              s.id AS subject_id, s.subject_code, s.subject_name,
              f.faculty_code, f.name AS faculty_name,
              cs.start_time, cs.end_time, cs.session_type, cs.duration_hours, cs.room,
              cs.attendance_enabled, cs.effective_from, cs.source_note
       FROM class_schedules cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id
       JOIN faculty f ON f.id = cs.faculty_id
       WHERE cs.faculty_id = ${faculty.id}
         AND cs.day_of_week = ${weekday}
         AND cs.active = TRUE
         AND c.academic_year = '2026-27'
         AND (cs.effective_from IS NULL OR cs.effective_from <= ${date}::date)
         AND (${section ?? null}::text IS NULL OR cs.section = ${section ?? ""})
       ORDER BY cs.start_time, s.subject_name
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Faculty schedule error:", error);
    return res.status(500).json({ success: false, message: "Unable to load faculty schedule" });
  }
}

async function getWeeklySchedule(req, res) {
  const { date } = req.query;
  const weekday = getWeekday(date);

  if (weekday === null) {
    return res.status(400).json({ success: false, message: "A valid schedule date is required." });
  }

  try {
    const faculty = await getFacultyProfile(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const weekStart = getWeekStart(date, weekday);
    const rows = await db`
      SELECT cs.id AS schedule_id, cs.day_of_week,
              TO_CHAR(${weekStart}::date + cs.day_of_week, 'YYYY-MM-DD') AS schedule_date,
              TRIM(TO_CHAR(${weekStart}::date + cs.day_of_week, 'Day')) AS day_name,
              c.class_name, c.academic_year, cs.section,
              s.subject_code, s.subject_name, f.faculty_code, f.name AS faculty_name,
              cs.start_time, cs.end_time, cs.session_type, cs.duration_hours,
              cs.room, cs.attendance_enabled, cs.effective_from, cs.source_note
       FROM class_schedules cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id
       JOIN faculty f ON f.id = cs.faculty_id
       WHERE cs.faculty_id = ${faculty.id}
         AND cs.active = TRUE
         AND c.academic_year = '2026-27'
         AND (cs.effective_from IS NULL OR cs.effective_from <= (${weekStart}::date + cs.day_of_week))
      ORDER BY cs.day_of_week, cs.start_time, cs.section
    `;

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Faculty weekly schedule error:", error);
    return res.status(500).json({ success: false, message: "Unable to load faculty schedule" });
  }
}

async function getStudents(req, res) {
  const { section, scheduleId, date } = req.query;
  const weekday = getWeekday(date);

  if (!section || !scheduleId || weekday === null) {
    return res.status(400).json({
      success: false,
      message: "Section, date, and scheduled session are required."
    });
  }

  try {
    const faculty = await getFacultyProfile(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found"
      });
    }

    const schedules = await db`
      SELECT cs.id, cs.class_id, cs.subject_id, cs.section,
             c.class_name, s.subject_code, s.subject_name
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.id = ${Number(scheduleId)}
        AND cs.faculty_id = ${faculty.id}
        AND cs.section = ${section}
        AND cs.day_of_week = ${weekday}
        AND cs.active = TRUE AND cs.attendance_enabled = TRUE
        AND c.section = cs.section
        AND c.academic_year = '2026-27'
        AND (cs.effective_from IS NULL OR cs.effective_from <= ${date}::date)
      LIMIT 1
    `;

    if (!schedules.length) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this scheduled section."
      });
    }

    const studentCountRows = await db`
      SELECT COUNT(*)::integer AS student_count
      FROM students
      WHERE section = ${section}
    `;
    const studentCount = Number(studentCountRows[0]?.student_count || 0);
    const schedule = schedules[0];
    const rows = await db`
      SELECT st.id, st.user_id, st.roll_no, st.name, st.section, st.email,
             sess.id AS session_id,
             TO_CHAR(sess.attendance_date, 'YYYY-MM-DD') AS attendance_date,
             ar.status AS attendance_status
      FROM students st
      LEFT JOIN attendance_sessions sess
        ON sess.schedule_id = ${schedule.id}
       AND sess.attendance_date = ${date}::date
      LEFT JOIN attendance_records ar
        ON ar.session_id = sess.id AND ar.student_id = st.id
      WHERE st.section = ${section}
      ORDER BY st.roll_no
    `;

    if (rows.length === 0) {
      console.error("Faculty attendance roster is empty:", {
        facultyId: faculty.id,
        facultyCode: faculty.faculty_code,
        section: schedule.section,
        classId: schedule.class_id,
        subjectId: schedule.subject_id,
        scheduleId: schedule.id,
        studentCountQueryResult: studentCount
      });
    }

    return res.json({
      success: true,
      data: rows,
      meta: {
        section: schedule.section,
        classId: schedule.class_id,
        className: schedule.class_name,
        subject: {
          id: schedule.subject_id,
          code: schedule.subject_code,
          name: schedule.subject_name
        },
        date,
        scheduleId: schedule.id,
        sessionId: rows[0]?.session_id || null,
        studentCount
      }
    });
  } catch (error) {
    console.error("Faculty student roster error:", {
      facultyId: req.user.id,
      section,
      scheduleId,
      date,
      error
    });
    return res.status(500).json({ success: false, message: "Unable to load students" });
  }
}

module.exports = {
  getDashboard,
  getClasses,
  getSections,
  getSubjects,
  getSchedule,
  getWeeklySchedule,
  getStudents
};
