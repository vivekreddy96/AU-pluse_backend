const bcrypt = require("bcrypt");
const rawDb = require("../config/db");
require("dotenv").config({ path: "../.env" });

/*
 * Neon can occasionally return:
 *
 *   TypeError: fetch failed
 *
 * even though the database itself is healthy.
 *
 * AUPluse performs many sequential seed queries, so use a small
 * retry wrapper for transient Neon connection failures.
 */
async function dbQuery(strings, ...values) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await rawDb(strings, ...values);
    } catch (error) {
      const message = String(error?.message || "");
      const causeMessage = String(error?.cause?.message || "");

      const isTransientFetchError =
        message.includes("fetch failed") ||
        causeMessage.includes("fetch failed") ||
        error?.name === "NeonDbError";

      if (!isTransientFetchError || attempt === maxAttempts) {
        throw error;
      }

      const delay = attempt * 1000;

      console.log(
        `Neon request failed temporarily. ` +
        `Retrying ${attempt}/${maxAttempts - 1} ` +
        `in ${delay}ms...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }
}

/*
 * Keep the existing `db\`...\`` syntax throughout the seed file.
 */
const db = dbQuery;

const facultyDemoNames = Array.from(
  { length: 30 },
  (_, index) => `Faculty Member ${String(index + 1).padStart(2, "0")}`
);

const timetableTemplates = [
  {
    dayOfWeek: 0,
    startTime: "09:00:00",
    endTime: "12:40:00",
    subjectCode: "TECHTRAIN",
    sessionType: "TechnicalTraining",
    durationHours: 3.67,
    attendanceEnabled: false
  },
  {
    dayOfWeek: 0,
    startTime: "13:20:00",
    endTime: "16:05:00",
    subjectCode: "TECHTRAIN",
    sessionType: "TechnicalTraining",
    durationHours: 2.75,
    attendanceEnabled: false
  },
  {
    dayOfWeek: 1,
    startTime: "09:00:00",
    endTime: "09:55:00",
    subjectCode: "PY",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 1,
    startTime: "09:55:00",
    endTime: "10:50:00",
    subjectCode: "DCN",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 1,
    startTime: "10:50:00",
    endTime: "11:45:00",
    subjectCode: "PY",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 1,
    startTime: "11:45:00",
    endTime: "12:40:00",
    subjectCode: "OE1",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 1,
    startTime: "13:20:00",
    endTime: "16:05:00",
    subjectCode: "PSE1",
    sessionType: "Theory",
    durationHours: 2.75,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 2,
    startTime: "09:00:00",
    endTime: "09:55:00",
    subjectCode: "FLAT",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 2,
    startTime: "09:55:00",
    endTime: "12:40:00",
    subjectCode: "DCNLAB",
    sessionType: "Lab",
    durationHours: 2.75,
    room: null,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 2,
    startTime: "13:20:00",
    endTime: "16:05:00",
    subjectCode: "PYLAB",
    sessionType: "Lab",
    durationHours: 2.75,
    room: null,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 3,
    startTime: "09:00:00",
    endTime: "12:40:00",
    subjectCode: "EWTLAB",
    sessionType: "Lab",
    durationHours: 3.67,
    room: null,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 3,
    startTime: "13:20:00",
    endTime: "14:15:00",
    subjectCode: "FLAT",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 3,
    startTime: "14:15:00",
    endTime: "15:10:00",
    subjectCode: "DCN",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 3,
    startTime: "15:10:00",
    endTime: "16:05:00",
    subjectCode: "OE1",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 4,
    startTime: "09:00:00",
    endTime: "09:55:00",
    subjectCode: "DCN",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 4,
    startTime: "09:55:00",
    endTime: "12:40:00",
    subjectCode: "QAR",
    sessionType: "Theory",
    durationHours: 2.75,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 4,
    startTime: "13:20:00",
    endTime: "14:15:00",
    subjectCode: "PY",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 4,
    startTime: "14:15:00",
    endTime: "15:10:00",
    subjectCode: "FLAT",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 4,
    startTime: "15:10:00",
    endTime: "16:05:00",
    subjectCode: "OE1",
    sessionType: "Theory",
    durationHours: 0.92,
    attendanceEnabled: true
  },
  {
    dayOfWeek: 5,
    startTime: "09:00:00",
    endTime: "12:40:00",
    subjectCode: "ACTIVITY",
    sessionType: "ProfessionalActivity",
    durationHours: 3.67,
    attendanceEnabled: false
  },
  {
    dayOfWeek: 5,
    startTime: "13:20:00",
    endTime: "16:05:00",
    subjectCode: "SPORTS",
    sessionType: "Sports",
    durationHours: 2.75,
    attendanceEnabled: false
  }
];

/* =========================================================
   DATABASE SCHEMA
   ========================================================= */

async function ensureSchema() {
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      username VARCHAR(150) UNIQUE,
      email VARCHAR(150) UNIQUE,
      password VARCHAR(255) NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('faculty', 'student')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id),
      roll_no VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      section VARCHAR(20) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      UNIQUE (roll_no),
      UNIQUE (email)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id),
      faculty_code VARCHAR(30) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      UNIQUE (email)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      subject_code VARCHAR(30) NOT NULL UNIQUE,
      subject_name VARCHAR(150) NOT NULL,
      UNIQUE (subject_name)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      class_name VARCHAR(80) NOT NULL,
      section VARCHAR(20) NOT NULL,
      academic_year VARCHAR(20) NOT NULL,
      UNIQUE (class_name, section, academic_year)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS faculty_assignments (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      faculty_id INTEGER NOT NULL REFERENCES faculty(id),
      class_id INTEGER NOT NULL REFERENCES classes(id),
      section VARCHAR(20) NOT NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (faculty_id, class_id, section, subject_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS class_schedules (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      section VARCHAR(20) NOT NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      faculty_id INTEGER NOT NULL REFERENCES faculty(id),
      day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 5),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      session_type TEXT NOT NULL DEFAULT 'Theory'
        CHECK (
          session_type IN (
            'Theory',
            'Practical',
            'Lab',
            'TechnicalTraining',
            'ProfessionalActivity',
            'Sports',
            'Other'
          )
        ),
      duration_hours NUMERIC(4,2) NOT NULL DEFAULT 1.00,
      room VARCHAR(80) DEFAULT NULL,
      effective_from DATE DEFAULT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      source_note VARCHAR(255) DEFAULT NULL,
      CHECK (end_time > start_time),
      UNIQUE (class_id, section, day_of_week, start_time, active)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      faculty_id INTEGER NOT NULL REFERENCES faculty(id),
      schedule_id INTEGER REFERENCES class_schedules(id),
      section VARCHAR(20) NOT NULL,
      attendance_date DATE NOT NULL,
      session_type TEXT NOT NULL DEFAULT 'Theory'
        CHECK (session_type IN ('Theory', 'Practical')),
      duration_hours NUMERIC(4,2) NOT NULL DEFAULT 1.00,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS session_identity_scheduled
    ON attendance_sessions (schedule_id, attendance_date)
    WHERE schedule_id IS NOT NULL
  `;

  await db`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (session_id, student_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS attendance_audit (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES attendance_records(id),
      previous_status TEXT NOT NULL CHECK (previous_status IN ('Present', 'Absent')),
      new_status TEXT NOT NULL CHECK (new_status IN ('Present', 'Absent')),
      changed_by_faculty_id INTEGER NOT NULL REFERENCES faculty(id),
      changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      reason VARCHAR(255) DEFAULT NULL
    )
  `;

  /*
    Legacy attendance table kept for compatibility with existing
    AUPluse backend code.
  */
  await db`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      faculty_id INTEGER NOT NULL REFERENCES faculty(id),
      attendance_date DATE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
      UNIQUE (student_id, subject_id, attendance_date)
    )
  `;

  await db`
    ALTER TABLE class_schedules
    ADD COLUMN IF NOT EXISTS effective_from DATE
  `;

  await db`
    ALTER TABLE class_schedules
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE
  `;

  await db`
    ALTER TABLE class_schedules
    ADD COLUMN IF NOT EXISTS attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE
  `;

  await db`
    ALTER TABLE class_schedules
    ADD COLUMN IF NOT EXISTS source_note VARCHAR(255)
  `;

  await db`
    ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES class_schedules(id)
  `;

  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS schedule_slot_active
    ON class_schedules (
      class_id,
      section,
      day_of_week,
      start_time,
      active
    )
  `;

  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS session_identity_scheduled
    ON attendance_sessions (schedule_id, attendance_date)
    WHERE schedule_id IS NOT NULL
  `;
}

/* =========================================================
   FACULTY SEED
   ========================================================= */

async function seedFacultyAccount(facultyNumber, passwordHash) {
  const suffix = String(facultyNumber).padStart(3, "0");

  const username = `faculty${suffix}`;
  const facultyCode = `FAC${suffix}`;
  const email = `${username}@anurag.edu.in`;
  const name = facultyDemoNames[facultyNumber - 1];

  const existingUsers = await db`
    SELECT id, role
    FROM users
    WHERE username = ${username}
    LIMIT 1
  `;

  let userId;

  if (existingUsers.length) {
    if (existingUsers[0].role !== "faculty") {
      throw new Error(
        `Cannot seed ${username}: username is already assigned to a non-faculty user.`
      );
    }

    userId = existingUsers[0].id;
  } else {
    const insertResult = await db`
      INSERT INTO users (
        username,
        email,
        password,
        role
      )
      VALUES (
        ${username},
        ${email},
        ${passwordHash},
        'faculty'
      )
      RETURNING id
    `;

    userId = insertResult[0].id;
  }

  const linkedFaculty = await db`
    SELECT id, faculty_code
    FROM faculty
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (linkedFaculty.length) {
    if (linkedFaculty[0].faculty_code !== facultyCode) {
      throw new Error(
        `Cannot seed ${username}: its existing faculty code is ${linkedFaculty[0].faculty_code}.`
      );
    }

    return {
      id: linkedFaculty[0].id,
      userId,
      facultyCode,
      username
    };
  }

  const facultyCodeRows = await db`
    SELECT id, user_id
    FROM faculty
    WHERE faculty_code = ${facultyCode}
    LIMIT 1
  `;

  if (facultyCodeRows.length) {
    throw new Error(
      `Cannot seed ${facultyCode}: faculty code is already linked to another user.`
    );
  }

  const insertResult = await db`
    INSERT INTO faculty (
      user_id,
      faculty_code,
      name,
      email
    )
    VALUES (
      ${userId},
      ${facultyCode},
      ${name},
      ${email}
    )
    RETURNING id
  `;

  return {
    id: insertResult[0].id,
    userId,
    facultyCode,
    username
  };
}

/* =========================================================
   MAIN SEED
   ========================================================= */

async function seed() {
  console.log("Starting AUPluse development seed...");

  await ensureSchema();

  const facultyDefaultPasswordHash = await bcrypt.hash(
    "au@123456",
    10
  );

  const studentDefaultPasswordHash = await bcrypt.hash(
    "au@123456",
    10
  );

  /* ---------------------------------------------------------
     FACULTY
     --------------------------------------------------------- */

  const facultyProfiles = [];

  for (let facultyNumber = 1; facultyNumber <= 30; facultyNumber += 1) {
    facultyProfiles.push(
      await seedFacultyAccount(
        facultyNumber,
        facultyDefaultPasswordHash
      )
    );
  }

  /* ---------------------------------------------------------
     STUDENT ROLL NUMBERS
     --------------------------------------------------------- */

  const sectionRolls = {
    A: [
      "24eg112a01","24eg112a02","24eg112a03","24eg112a04",
      "24eg112a05","24eg112a06","24eg112a07","24eg112a08",
      "24eg112a09","24eg112a10","24eg112a11","24eg112a12",
      "24eg112a13","24eg112a14","24eg112a15","24eg112a16",
      "24eg112a17","24eg112a18","24eg112a19","24eg112a20",
      "24eg112a21","24eg112a22","24eg112a23","24eg112a24",
      "24eg112a25","24eg112a26","24eg112a27","24eg112a28",
      "24eg112a29","24eg112a30","24eg112a31","24eg112a32",
      "24eg112a33","24eg112a34","24eg112a35","24eg112a36",
      "24eg112a37","24eg112a38","24eg112a39","24eg112a40",
      "24eg112a41","24eg112a42","24eg112a43","24eg112a44",
      "24eg112a45","24eg112a46","24eg112a47","24eg112a48",
      "24eg112a49","24eg112a50","24eg112a51","24eg112a52",
      "24eg112a53","24eg112a54","24eg112a55","24eg112a56",
      "24eg112a57","24eg112a58","24eg112a59","24eg112a60",
      "24eg112a61","24eg112a62","24eg112a63","24eg112a64",
      "24eg112a65","24eg112a66",
      "25eg512a01","25eg512a02","25eg512a03","25eg512a04",
      "25eg512a05","25eg512a06","25eg512a07"
    ],

    B: [
      "24eg112b01","24eg112b02","24eg112b03","24eg112b04",
      "24eg112b05","24eg112b06","24eg112b07","24eg112b08",
      "24eg112b09","24eg112b10","24eg112b11","24eg112b12",
      "24eg112b13","24eg112b14","24eg112b15","24eg112b16",
      "24eg112b17","24eg112b18","24eg112b19","24eg112b20",
      "24eg112b21","24eg112b22","24eg112b23","24eg112b24",
      "24eg112b25","24eg112b26","24eg112b27","24eg112b28",
      "24eg112b29","24eg112b30","24eg112b31","24eg112b32",
      "24eg112b33","24eg112b34","24eg112b35","24eg112b36",
      "24eg112b37","24eg112b38","24eg112b39","24eg112b40",
      "24eg112b41","24eg112b42","24eg112b43","24eg112b44",
      "24eg112b45","24eg112b46","24eg112b47","24eg112b48",
      "24eg112b49","24eg112b50","24eg112b51","24eg112b52",
      "24eg112b53","24eg112b54","24eg112b55","24eg112b56",
      "24eg112b57","24eg112b58","24eg112b59","24eg112b60",
      "24eg112b61","24eg112b62","24eg112b63","24eg112b64",
      "24eg112b65","24eg112b66",
      "25eg512b01","25eg512b02","25eg512b03",
      "25eg512b04","25eg512b05","25eg512b06"
    ],

    C: [
      "24eg112c01","24eg112c02","24eg112c03","24eg112c04",
      "24eg112c05","24eg112c06","24eg112c07","24eg112c08",
      "24eg112c09","24eg112c10","24eg112c11","24eg112c12",
      "24eg112c13","24eg112c14","24eg112c15","24eg112c16",
      "24eg112c17","24eg112c18","24eg112c19","24eg112c20",
      "24eg112c21","24eg112c22","24eg112c23","24eg112c24",
      "24eg112c25","24eg112c26","24eg112c27","24eg112c28",
      "24eg112c29","24eg112c30","24eg112c31","24eg112c32",
      "24eg112c33","24eg112c34","24eg112c35","24eg112c36",
      "24eg112c37","24eg112c38","24eg112c39","24eg112c40",
      "24eg112c41","24eg112c42","24eg112c43","24eg112c44",
      "24eg112c45","24eg112c46","24eg112c47","24eg112c48",
      "24eg112c49","24eg112c50","24eg112c51","24eg112c52",
      "24eg112c53","24eg112c54","24eg112c55","24eg112c56",
      "24eg112c57","24eg112c58","24eg112c59","24eg112c60",
      "24eg112c61","24eg112c62","24eg112c63","24eg112c64",
      "24eg112c65","24eg112c66",
      "25eg512c01","25eg512c02","25eg512c03","25eg512c04",
      "25eg512c05","25eg512c06","25eg512c07"
    ],

    D: [
      "24eg112d01","24eg112d02","24eg112d03","24eg112d04",
      "24eg112d05","24eg112d06","24eg112d07","24eg112d08",
      "24eg112d09","24eg112d10","24eg112d11","24eg112d12",
      "24eg112d13","24eg112d14","24eg112d15","24eg112d16",
      "24eg112d17","24eg112d18","24eg112d19","24eg112d20",
      "24eg112d21","24eg112d22","24eg112d23","24eg112d24",
      "24eg112d25","24eg112d26","24eg112d27","24eg112d28",
      "24eg112d29","24eg112d30","24eg112d31","24eg112d32",
      "24eg112d33","24eg112d34","24eg112d35","24eg112d36",
      "24eg112d37","24eg112d38","24eg112d39","24eg112d40",
      "24eg112d41","24eg112d42","24eg112d43","24eg112d44",
      "24eg112d45","24eg112d46","24eg112d47","24eg112d48",
      "24eg112d49","24eg112d50","24eg112d51","24eg112d52",
      "24eg112d53","24eg112d54","24eg112d55","24eg112d56",
      "24eg112d57","24eg112d58","24eg112d59","24eg112d60",
      "24eg112d61","24eg112d62","24eg112d63","24eg112d64",
      "24eg112d65","24eg112d66",
      "25eg512d01","25eg512d02","25eg512d03",
      "25eg512d04","25eg512d05","25eg512d06"
    ]
  };

  const realStudentRolls = Object.values(sectionRolls).flat();

  const studentUserIds = new Map();

  /* ---------------------------------------------------------
     CREATE STUDENT USERS
     --------------------------------------------------------- */

 for (const rollNo of realStudentRolls) {
    const emailAddress = `${rollNo}@anurag.edu.in`;

    console.log(`Seeding student user: ${rollNo}`);

    const existingStudentUsers = await db`	
      SELECT id, role
      FROM users
      WHERE email = ${emailAddress}
      LIMIT 1
    `;

    if (existingStudentUsers.length) {
      if (existingStudentUsers[0].role !== "student") {
        throw new Error(
          `Cannot seed ${emailAddress}: email belongs to a non-student user.`
        );
      }

      studentUserIds.set(
        rollNo,
        existingStudentUsers[0].id
      );
    } else {
      const insertResult = await db`
        INSERT INTO users (
          email,
          username,
          password,
          role
        )
        VALUES (
          ${emailAddress},
          ${emailAddress},
          ${studentDefaultPasswordHash},
          'student'
        )
        RETURNING id
      `;

      studentUserIds.set(
        rollNo,
        insertResult[0].id
      );
    }
  }

  /* ---------------------------------------------------------
     CREATE STUDENT PROFILES
     --------------------------------------------------------- */

  const studentSeedRows = Object.entries(sectionRolls).flatMap(
    ([section, rolls]) =>
      rolls.map((rollNo) => {
        const emailAddress = `${rollNo}@anurag.edu.in`;

        return [
          studentUserIds.get(rollNo),
          rollNo,
          `Student ${rollNo}`,
          section,
          emailAddress
        ];
      })
  );

  for (const row of studentSeedRows) {
    const existingStudentProfiles = await db`
      SELECT id
      FROM students
      WHERE roll_no = ${row[1]}
         OR user_id = ${row[0]}
      LIMIT 1
    `;

    if (existingStudentProfiles.length) {
      continue;
    }

    await db`
      INSERT INTO students (
        user_id,
        roll_no,
        name,
        section,
        email
      )
      VALUES (
        ${row[0]},
        ${row[1]},
        ${row[2]},
        ${row[3]},
        ${row[4]}
      )
    `;
  }

  /* ---------------------------------------------------------
     SUBJECTS
     --------------------------------------------------------- */

  const coreSubjects = [
    ["DCN", "Data Communications and Networking"],
    ["PY", "Introduction to Python Programming"],
    ["FLAT", "Formal Languages and Automata Theory"],
    ["EWT", "Essentials of Web Technologies"],
    ["SES", "Professional Excellence through Soft Skills"],
    ["QAR", "Quantitative Aptitude and Reasoning"],
    ["PSE1", "Problem Solving in Engineering - I"],
    ["FSDJ", "Full Stack Development Using Java"],
    ["OE1", "Open Elective-1"],
    ["DCNLAB", "Data Communications and Networking Lab"],
    ["PYLAB", "Introduction to Python Programming Lab"],
    ["EWTLAB", "Essentials of Web Technologies Lab"],
    ["TECHTRAIN", "Technical Training"],
    ["ACTIVITY", "Professional / Technical / Other Activities"],
    ["SPORTS", "Sports"]
  ];

   const subjectCodes = coreSubjects.map(
    ([subjectCode]) => subjectCode
  );

  const subjectNames = coreSubjects.map(
    ([, subjectName]) => subjectName
  );

  await db`
    INSERT INTO subjects (
      subject_code,
      subject_name
    )
    SELECT *
    FROM UNNEST(
      ${subjectCodes}::text[],
      ${subjectNames}::text[]
    )
    ON CONFLICT (subject_code) DO NOTHING
  `;

  /* ---------------------------------------------------------
     CLASSES
     --------------------------------------------------------- */

  for (const section of ["A", "B", "C", "D"]) {
    const existingClass = await db`
      SELECT id
      FROM classes
      WHERE class_name = 'Information Technology (IT)'
        AND section = ${section}
        AND academic_year = '2026-27'
      ORDER BY id
      LIMIT 1
    `;

    if (!existingClass.length) {
      await db`
        INSERT INTO classes (
          class_name,
          section,
          academic_year
        )
        VALUES (
          'Information Technology (IT)',
          ${section},
          '2026-27'
        )
        ON CONFLICT (
          class_name,
          section,
          academic_year
        ) DO NOTHING
      `;
    }
  }

  const classRows = await db`
    SELECT MIN(id) AS id,
           class_name,
           section
    FROM classes
    WHERE class_name = 'Information Technology (IT)'
      AND academic_year = '2026-27'
    GROUP BY class_name, section
    ORDER BY section
  `;

  const subjectRows = [];

  for (const [subjectCode] of coreSubjects) {
    const subject = await db`
      SELECT id,
             subject_code,
             subject_name
      FROM subjects
      WHERE subject_code = ${subjectCode}
    `;

    subjectRows.push(...subject);
  }

  if (classRows.length !== 4) {
    throw new Error(
      `Expected four IT sections but found ${classRows.length}.`
    );
  }

  const subjectsByCode = new Map(
    subjectRows.map((subject) => [
      subject.subject_code,
      subject
    ])
  );

  const derivedSourceNote =
    "Existing AUPluse seed timetable applied to development sections.";
  const facultyBySection = {
    A: facultyProfiles[0],
    B: facultyProfiles[1],
    C: facultyProfiles[2],
    D: facultyProfiles[3]
  };
  const classIds = classRows.map((row) => row.id);

  await db`
    DELETE FROM faculty_assignments
    WHERE class_id = ANY(${classIds}::integer[])
  `;

  /* ---------------------------------------------------------
    DEACTIVATE LEGACY SCHEDULES
     --------------------------------------------------------- */

  await db`
    UPDATE class_schedules cs
    SET active = FALSE
    FROM classes c
    WHERE c.id = cs.class_id
      AND c.id = ANY(${classIds}::integer[])
      AND cs.active = TRUE
      AND (
        (cs.effective_from IS NULL AND cs.source_note IS NULL)
        OR NOT EXISTS (
          SELECT 1
          FROM UNNEST(
            ${timetableTemplates.map((template) => template.dayOfWeek)}::smallint[],
            ${timetableTemplates.map((template) => template.startTime)}::time[]
          ) AS expected(day_of_week, start_time)
          WHERE expected.day_of_week = cs.day_of_week
            AND expected.start_time = cs.start_time
        )
      )
  `;

  /* ---------------------------------------------------------
    CREATE A-D TIMETABLE
     --------------------------------------------------------- */

  for (const classRow of classRows) {
    const faculty = facultyBySection[classRow.section];

    if (!faculty) {
      throw new Error(`No development faculty is configured for section ${classRow.section}.`);
    }

    for (const template of timetableTemplates) {
      const subject = subjectsByCode.get(
        template.subjectCode
      );

      if (!subject) {
        throw new Error(
          `Subject ${template.subjectCode} was not found.`
        );
      }

      await db`
        INSERT INTO faculty_assignments (
          faculty_id,
          class_id,
          section,
          subject_id
        )
        VALUES (
          ${faculty.id},
          ${classRow.id},
          ${classRow.section},
          ${subject.id}
        )
        ON CONFLICT (
          faculty_id,
          class_id,
          section,
          subject_id
        ) DO NOTHING
      `;

      await db`
        INSERT INTO class_schedules (
          class_id,
          section,
          subject_id,
          faculty_id,
          day_of_week,
          start_time,
          end_time,
          session_type,
          duration_hours,
          room,
          effective_from,
          active,
          attendance_enabled,
          source_note
        )
        VALUES (
          ${classRow.id},
          ${classRow.section},
          ${subject.id},
          ${faculty.id},
          ${template.dayOfWeek},
          ${template.startTime},
          ${template.endTime},
          ${template.sessionType},
          ${template.durationHours},
          ${template.room ?? null},
          '2026-06-29',
          TRUE,
          ${template.attendanceEnabled},
          ${derivedSourceNote}
        )
        ON CONFLICT (
          class_id,
          section,
          day_of_week,
          start_time,
          active
        )
        DO UPDATE SET
          subject_id = EXCLUDED.subject_id,
          faculty_id = EXCLUDED.faculty_id,
          end_time = EXCLUDED.end_time,
          session_type = EXCLUDED.session_type,
          duration_hours = EXCLUDED.duration_hours,
          room = EXCLUDED.room,
          effective_from = EXCLUDED.effective_from,
          attendance_enabled = EXCLUDED.attendance_enabled,
          source_note = EXCLUDED.source_note
      `;
    }
  }

  /* ---------------------------------------------------------
    VERIFY A-D SCHEDULE
     --------------------------------------------------------- */

  const [sectionScheduleChecks] = await db`
    SELECT
      COUNT(*) AS active_slots,
      COUNT(DISTINCT faculty_id) AS assigned_faculty,
      COUNT(*) FILTER (
        WHERE effective_from = DATE '2026-06-29'
      ) AS effective_slots,
      COUNT(*) FILTER (
        WHERE source_note = ${derivedSourceNote}
      ) AS derived_slots,
      COUNT(*) FILTER (
        WHERE attendance_enabled = FALSE
      ) AS activity_slots,
      COUNT(*) FILTER (
        WHERE room IS NULL
      ) AS roomless_slots
    FROM class_schedules cs
    JOIN classes c
      ON c.id = cs.class_id
    WHERE c.section IN ('A', 'B', 'C', 'D')
      AND c.academic_year = '2026-27'
      AND cs.active = TRUE
  `;

  const [sectionIntegrityChecks] = await db`
    SELECT
      (
        SELECT COUNT(*)
        FROM class_schedules first_slot
        JOIN classes first_class
          ON first_class.id = first_slot.class_id
        JOIN class_schedules next_slot
          ON next_slot.class_id = first_slot.class_id
         AND next_slot.day_of_week = first_slot.day_of_week
         AND next_slot.id > first_slot.id
         AND first_slot.start_time < next_slot.end_time
         AND next_slot.start_time < first_slot.end_time
        WHERE first_class.section IN ('A', 'B', 'C', 'D')
          AND first_class.academic_year = '2026-27'
          AND first_slot.active = TRUE
          AND next_slot.active = TRUE
      ) AS overlap_count,

      (
        SELECT COUNT(*)
        FROM class_schedules cs
        JOIN classes c
          ON c.id = cs.class_id
        WHERE c.section IN ('A', 'B', 'C', 'D')
          AND c.academic_year = '2026-27'
          AND cs.active = TRUE
          AND cs.start_time < '13:20:00'
          AND cs.end_time > '12:40:00'
      ) AS lunch_overlap_count,

      (
        SELECT COUNT(*)
        FROM class_schedules cs
        JOIN classes c
          ON c.id = cs.class_id
        WHERE c.section IN ('A', 'B', 'C', 'D')
          AND c.academic_year = '2026-27'
          AND cs.active = TRUE
          AND LOWER(cs.session_type) = 'lab'
          AND cs.duration_hours >= 2.7
      ) AS long_lab_count
  `;

  const sectionScheduleRows = await db`
    SELECT
      cs.section,
      cs.day_of_week,
      cs.start_time,
      cs.end_time,
      s.subject_code,
      f.faculty_code,
      cs.session_type,
      TO_CHAR(
        cs.effective_from,
        'YYYY-MM-DD'
      ) AS effective_from,
      cs.attendance_enabled,
      cs.room,
      cs.source_note
    FROM class_schedules cs
    JOIN classes c
      ON c.id = cs.class_id
    JOIN subjects s
      ON s.id = cs.subject_id
    JOIN faculty f
      ON f.id = cs.faculty_id
    WHERE c.section IN ('A', 'B', 'C', 'D')
      AND c.academic_year = '2026-27'
      AND cs.active = TRUE
    ORDER BY
      cs.section,
      cs.day_of_week,
      cs.start_time
  `;

  const expectedSchedule = ["A", "B", "C", "D"].flatMap(
    (section) =>
      timetableTemplates.map((template) => ({
        section,
        faculty_code: `FAC${String("ABCD".indexOf(section) + 1).padStart(3, "0")}`,
        day_of_week: template.dayOfWeek,
        start_time: template.startTime,
        end_time: template.endTime,
        subject_code: template.subjectCode,
        session_type: template.sessionType,
        attendance_enabled: template.attendanceEnabled
      }))
  );

  const sectionScheduleMatchesSource =
    sectionScheduleRows.length === expectedSchedule.length &&
    sectionScheduleRows.every((row, index) => {
      const expected =
        expectedSchedule[index];

      return (
        row.section === expected.section &&
        row.faculty_code === expected.faculty_code &&
        Number(row.day_of_week) ===
          expected.day_of_week &&
        row.start_time === expected.start_time &&
        row.end_time === expected.end_time &&
        row.subject_code === expected.subject_code &&
        row.session_type === expected.session_type &&
        row.effective_from === "2026-06-29" &&
        row.attendance_enabled ===
          expected.attendance_enabled &&
        row.room === null &&
        row.source_note ===
          derivedSourceNote
      );
    });

  /* ---------------------------------------------------------
     COUNTS
     --------------------------------------------------------- */

  const [seedCounts] = await db`
    SELECT
      (
        SELECT COUNT(*)
        FROM faculty
      ) AS faculty_count,

      (
        SELECT COUNT(*)
        FROM students
      ) AS student_count,

      (
        SELECT COUNT(*)
        FROM students st
        JOIN users u ON u.id = st.user_id AND u.role = 'student'
      ) AS linked_student_count,

      (
        SELECT COUNT(*)
        FROM classes
        WHERE class_name = 'Information Technology (IT)'
          AND academic_year = '2026-27'
          AND section IN ('A', 'B', 'C', 'D')
      ) AS class_count,

      (
        SELECT COUNT(*)
        FROM faculty f
        JOIN users u
          ON u.id = f.user_id
         AND u.role = 'faculty'
      ) AS linked_faculty_count,

      (
        SELECT COUNT(DISTINCT faculty_id)
        FROM faculty_assignments
      ) AS assigned_faculty_count,

      (
        SELECT COUNT(*)
        FROM subjects
        WHERE subject_code = ANY(
          ${coreSubjects.map(
            ([subjectCode]) => subjectCode
          )}::text[]
        )
      ) AS supplied_subject_count
  `;

  const sectionCounts = await db`
    SELECT
      section,
      COUNT(*) AS total
    FROM students
    GROUP BY section
    ORDER BY section
  `;

  /* ---------------------------------------------------------
     FACULTY LOGIN CHECK
     --------------------------------------------------------- */

  const seededFaculty = await db`
    SELECT
      f.faculty_code,
      f.email,
      f.name,
      u.username,
      u.role,
      u.password
    FROM faculty f
    JOIN users u
      ON u.id = f.user_id
    WHERE f.faculty_code BETWEEN 'FAC001' AND 'FAC030'
    ORDER BY f.faculty_code
  `;

  /* ---------------------------------------------------------
     STUDENT LOGIN CHECK
     --------------------------------------------------------- */

  const studentLoginRows = await db`
    SELECT password
    FROM users
    WHERE email = '24eg112a24@anurag.edu.in'
      AND role = 'student'
    LIMIT 1
  `;

  const additionalStudentLoginRows = await db`
    SELECT password
    FROM users
    WHERE email = '25eg512a01@anurag.edu.in'
      AND role = 'student'
    LIMIT 1
  `;

  const invalidStudentEmailRows = await db`
    SELECT COUNT(*) AS total
    FROM students
    WHERE email <> (
      roll_no || '@anurag.edu.in'
    )
  `;

  /* ---------------------------------------------------------
     VALIDATION
     --------------------------------------------------------- */

  const facultyAccountsValid =
    seededFaculty.length === 30 &&
    seededFaculty.every((faculty, index) => {
      const suffix = String(index + 1).padStart(
        3,
        "0"
      );

      return (
        faculty.faculty_code === `FAC${suffix}` &&
        faculty.username === `faculty${suffix}` &&
        faculty.email ===
          `faculty${suffix}@anurag.edu.in` &&
        Boolean(faculty.name)
      );
    });

  const faculty001 = seededFaculty.find(
    (faculty) =>
      faculty.username === "faculty001"
  );

  const faculty030 = seededFaculty.find(
    (faculty) =>
      faculty.username === "faculty030"
  );

  const loginChecks = {
    faculty001: Boolean(
      faculty001 &&
      await bcrypt.compare(
        "au@123456",
        faculty001.password
      )
    ),

    faculty030: Boolean(
      faculty030 &&
      await bcrypt.compare(
        "au@123456",
        faculty030.password
      )
    ),

    student: Boolean(
      studentLoginRows.length &&
      await bcrypt.compare(
        "au@123456",
        studentLoginRows[0].password
      )
    ),

    additionalStudent: Boolean(
      additionalStudentLoginRows.length &&
      await bcrypt.compare(
        "au@123456",
        additionalStudentLoginRows[0].password
      )
    )
  };

  const expectedSectionCounts = [
    73,
    72,
    73,
    72
  ];

  const studentSectionsValid =
    sectionCounts.length === 4 &&
    sectionCounts.every(
      (section, index) =>
        Number(section.total) ===
        expectedSectionCounts[index]
    );

  /* ---------------------------------------------------------
     FINAL VALIDATION
     --------------------------------------------------------- */

  if (
    Number(seedCounts.faculty_count) !== 30 ||
    Number(seedCounts.student_count) !== 290 ||
    Number(seedCounts.linked_student_count) !== 290 ||
    Number(seedCounts.linked_faculty_count) !== 30 ||
    Number(seedCounts.class_count) !== 4 ||
    Number(sectionScheduleChecks.active_slots) !== 84 ||
    Number(sectionScheduleChecks.assigned_faculty) !== 4 ||
    Number(sectionScheduleChecks.effective_slots) !== 84 ||
    Number(sectionScheduleChecks.derived_slots) !== 84 ||
    Number(sectionScheduleChecks.activity_slots) !== 16 ||
    Number(sectionScheduleChecks.roomless_slots) !== 84 ||
    Number(seedCounts.supplied_subject_count) !==
      coreSubjects.length ||
    Number(sectionIntegrityChecks.overlap_count) !== 0 ||
    Number(sectionIntegrityChecks.lunch_overlap_count) !== 0 ||
    Number(sectionIntegrityChecks.long_lab_count) !== 12 ||
    !sectionScheduleMatchesSource ||
    Number(invalidStudentEmailRows[0].total) !== 0 ||
    !studentSectionsValid ||
    !facultyAccountsValid ||
    !Object.values(loginChecks).every(Boolean)
  ) {
    throw new Error(
      `Seed verification failed: ${JSON.stringify({
        seedCounts,
        sectionScheduleChecks,
        sectionIntegrityChecks,
        sectionScheduleMatchesSource,
        sectionCounts,
        studentSectionsValid,
        facultyAccountsValid,
        loginChecks
      })}`
    );
  }

  /* ---------------------------------------------------------
     SUCCESS
     --------------------------------------------------------- */

  console.log(
    "AUPluse development seed completed successfully."
  );

  console.log(
    `Verified ${seedCounts.faculty_count} faculty, ` +
    `${seedCounts.student_count} students, and ` +
    `${sectionScheduleChecks.active_slots} A-D timetable entries.`
  );

  console.log(
    `Students per section: ${sectionCounts
      .map(
        (section) =>
          `${section.section}=${section.total}`
      )
      .join(", ")}`
  );

  console.log(
    `Subjects: ${coreSubjects
      .map(([subjectCode]) => subjectCode)
      .join(", ")}`
  );

  console.log(
    `A-D timetable ownership and rows verified: ${sectionScheduleMatchesSource}`
  );

  console.log(
    `A-D overlaps: ${sectionIntegrityChecks.overlap_count}; ` +
    `lunch overlaps: ${sectionIntegrityChecks.lunch_overlap_count}; ` +
    `long labs: ${sectionIntegrityChecks.long_lab_count}`
  );

  console.log(
    `Faculty IDs: ${seededFaculty
      .map((faculty) => faculty.faculty_code)
      .join(", ")}`
  );

  console.log(
    `Faculty usernames: ${seededFaculty
      .map((faculty) => faculty.username)
      .join(", ")}`
  );

  console.log(
    `Bcrypt login checks passed: ${Object.keys(
      loginChecks
    ).join(", ")}`
  );

  console.log(
    "Faculty demo credentials: faculty001 through faculty030 / au@123456"
  );

  console.log(
    "Student credential template: <roll_number>@anurag.edu.in / au@123456"
  );
}

/* =========================================================
   START
   ========================================================= */

seed().catch((error) => {
  console.error("\n========================================");
  console.error("AUPluse SEED FAILED");
  console.error("========================================");
  console.error("Message:", error.message);
  console.error("Name:", error.name);
  console.error("Cause:", error.cause);
  console.error("Stack:");
  console.error(error.stack);
  console.error("========================================\n");

  process.exit(1);
});