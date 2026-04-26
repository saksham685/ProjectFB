const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: String, required: true },
    course: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
