const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function login(req, res) {
    try {
        const { role, email, username, password } = req.body;
        const rawIdentifier = role === "student" ? email : username;
        const identifier = typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";

        if (!["student", "faculty"].includes(role) || !identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Role-specific login identifier and password are required"
            });
        }

        const lookupValue = identifier.toLowerCase();
        if (role === "student" && !/^[^@\s]+@anurag\.edu\.in$/i.test(identifier)) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const users = role === "student"
            ? await db`
                SELECT id, username, email, password, role
                FROM users
                WHERE role = 'student' AND LOWER(email) = ${lookupValue}
                LIMIT 1
            `
            : await db`
                SELECT u.id, u.username, u.email, u.password, u.role, f.faculty_code
                FROM users u
                LEFT JOIN faculty f ON f.user_id = u.id
                WHERE u.role = 'faculty' AND LOWER(u.username) = ${lookupValue}
                LIMIT 1
            `;

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];
        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || "aupluse-secret-key",
            { expiresIn: "8h" }
        );

        const loginUser = {
            id: user.id,
            username: user.username,
            email: user.email || null,
            role: user.role,
            ...(user.role === "faculty" ? { facultyCode: user.faculty_code || null } : {})
        };

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: loginUser
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

async function getMe(req, res) {
    return res.json({
        success: true,
        data: {
            id: req.user.id,
            username: req.user.username || req.user.email,
            email: req.user.email || null,
            role: req.user.role,
            ...(req.user.role === "faculty" ? { facultyCode: req.user.faculty_code || null } : {})
        }
    });
}

async function logout(req, res) {
    return res.json({
        success: true,
        message: "Logout successful"
    });
}

module.exports = { login, getMe, logout };
