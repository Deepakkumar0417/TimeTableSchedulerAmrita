// backend/models/semester.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

/* ---------- Course (embedded) ---------- */
const courseSchema = new Schema(
  {
    courseId: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    assignees: [
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    sections: { type: [String], default: [] } // e.g., ["A","B"]
  }
],

    // L-T-P inputs
    theoryHours: { type: Number, default: 0, min: 0 },    // L
    tutorialHours: { type: Number, default: 0, min: 0 },  // T
    labHours: { type: Number, default: 0, min: 0 },       // P (must be multiple of 3 if > 0)

    // Derived fields (stored for quick reads / scheduling)
    credits: { type: Number, default: 0 },                // CR = L + T + (P/3)
    theoryPeriodsPerWeek: { type: Number, default: 0 },   // L + T
    labBlocksPerWeek: { type: Number, default: 0 },       // P / 3

    // Filled later by teacher enrollments
    teachers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        default: undefined,
      },
    ],
  },
  { _id: true }
);

// Derive credits and weekly needs; validate lab multiple-of-3
courseSchema.pre('validate', function (next) {
  const L = Number(this.theoryHours || 0);
  const T = Number(this.tutorialHours || 0);
  const P = Number(this.labHours || 0);

  if (P < 0 || L < 0 || T < 0) {
    return next(new Error('Hour values cannot be negative'));
  }
  if (P % 3 !== 0) {
    return next(new Error('labHours must be a multiple of 3'));
  }

  this.credits = L + T + P / 3;
  this.theoryPeriodsPerWeek = L + T;
  this.labBlocksPerWeek = P / 3;

  next();
});

/* ---------- Semester ---------- */
const semesterSchema = new Schema(
  {
    // New relations (optional to preserve legacy data)
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },

    // Legacy stream string kept for compatibility (no enum: departments are dynamic)
    stream: { type: String, trim: true },

    semesterNum: { type: Number, required: true, min: 1 },
    isOdd: { type: Boolean, default: function () { return this.semesterNum % 2 === 1; } },

    year: { type: Number, required: true }, // e.g., 2025 (academic year start)

    // Sections configured by Admin (A, B, C, ...)
    sections: {
      type: [String],
      default: ['A'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1,
        message: 'At least one section is required',
      },
    },

    courses: { type: [courseSchema], default: [] },
  },
  { timestamps: true }
);

// Helpful indexes
semesterSchema.index({ cohortId: 1, semesterNum: 1 });
semesterSchema.index({ stream: 1, semesterNum: 1 });

const Semester = mongoose.model('Semester', semesterSchema);
export default Semester;
