import mongoose from 'mongoose'

const ProjectImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  order: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true }
})

const TransitionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['wipe', 'push', 'pull', 'swipe'], 
    default: 'wipe' 
  },
  direction: { 
    type: String, 
    enum: ['left', 'right', 'up', 'down'], 
    default: 'right' 
  },
  durationMs: { type: Number, default: 500 }
})

const TransformSchema = new mongoose.Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  scale: { type: Number, default: 1 }
})

const ExportSchema = new mongoose.Schema({
  durationSeconds: { type: Number, default: 30 },
  fps: { type: Number, default: 30 }
})

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  images: [ProjectImageSchema],
  frame1Url: { type: String },
  frame1W: { type: Number },
  frame1H: { type: Number },
  frame2Url: { type: String },
  frame2W: { type: Number },
  frame2H: { type: Number },
  transition: { type: TransitionSchema, default: () => ({}) },
  transform: { type: TransformSchema, default: () => ({}) },
  export: { type: ExportSchema, default: () => ({}) }
}, {
  timestamps: true
})

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema)