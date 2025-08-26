import mongoose from 'mongoose';

const TimeSlotSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    time: { type: String, required: true },
    type: { type: String, enum: ['theory', 'lab', 'break'], required: true },
    session: { type: String, default: 'FREE' }, // e.g., 'Theory: Math', 'Lab: Physics', 'OCCUPIED', 'FREE'
});

const TimetableSchema = new mongoose.Schema({
    semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true, unique: true },
    days: {
        Monday: [TimeSlotSchema],
        Tuesday: [TimeSlotSchema],
        Wednesday: [TimeSlotSchema],
        Thursday: [TimeSlotSchema],
        Friday: [TimeSlotSchema],
    },
    createdAt: { type: Date, default: Date.now },
});

const Timetable = mongoose.model('Timetable', TimetableSchema);

export default Timetable;
