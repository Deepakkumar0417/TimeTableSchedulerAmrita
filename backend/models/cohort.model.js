import mongoose from 'mongoose';
const { Schema } = mongoose;

const CohortSchema = new Schema({
  degreeId: { type: Schema.Types.ObjectId, ref: 'Degree', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  intakeYear: { type: Number, required: true },
  durationYears: { type: Number, required: true },
  totalSemesters: { type: Number, required: true }
}, { timestamps: true });

CohortSchema.index({ degreeId: 1, departmentId: 1, intakeYear: 1 }, { unique: true });

export default mongoose.model('Cohort', CohortSchema);
