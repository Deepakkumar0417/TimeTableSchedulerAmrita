import mongoose from 'mongoose';
const { Schema } = mongoose;

const DegreeSchema = new Schema({
  name: { type: String, required: true, trim: true }, // e.g., B.Tech
  level: { type: String, trim: true, default: '' },    // UG/PG (optional)
  durationYears: { type: Number, required: true, min: 1 },
  totalSemesters: { type: Number, required: true }     // derive = durationYears * 2
}, { timestamps: true });

export default mongoose.model('Degree', DegreeSchema);
