import mongoose from "mongoose";
const teacherSchema = new mongoose.Schema({
  email:
  {
    type:String,
    required: true,
    unique : true
  },
  password:
  {
    type: String,
    required: true,
    minlength: 6

  },
  name:
  {
    type: String,
    required: true,
  },
  phonenumber:
  {
    type:Number,
    required: true
  },
  department:
  {
    type:String,
    required: true,
    enum:['CSE', 'ECE', 'AIE']
  }
  

},
{
  timestamps: true
}
);

const Teacher =  mongoose.model('Teacher',teacherSchema);


export default Teacher;