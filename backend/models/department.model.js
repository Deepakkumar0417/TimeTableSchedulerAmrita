import mongoose from 'mongoose';
const { Schema } = mongoose;

const DepartmentSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Department', DepartmentSchema);
