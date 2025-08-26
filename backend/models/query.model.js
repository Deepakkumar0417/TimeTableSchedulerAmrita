import mongoose from 'mongoose';
const { Schema } = mongoose;

const QuerySchema = new Schema({
  title: { type: String, required: true, trim: true },
  body:  { type: String, required: true, trim: true },
  fromRole: { type: String, enum: ['teacher','student'], required: true },
  fromId: { type: Schema.Types.ObjectId, refPath: 'fromRole' }, // optional
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  semesterNum: { type: Number },
  section: { type: String },

  status: { type: String, enum: ['open','pending','resolved'], default: 'open' },
  priority: { type: String, enum: ['low','normal','high'], default: 'normal' }
}, { timestamps: true });

export default mongoose.model('Query', QuerySchema);
