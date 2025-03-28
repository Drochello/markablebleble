import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  username: string;
  stars: number;
  blackMark: boolean;
  blackMarkFrom?: number;
  blackMarkDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, required: true },
  stars: { type: Number, default: 0 },
  blackMark: { type: Boolean, default: false },
  blackMarkFrom: { type: Number },
  blackMarkDate: { type: Date },
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema); 