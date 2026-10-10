import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from '@/types';

export interface IUserDocument extends Omit<IUser, '_id' | 'password' | 'assignedServers'>, Document {
  password: string;
  assignedServers?: (mongoose.Types.ObjectId | string)[];
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'user'],
      default: 'user',
    },
    linuxUsername: {
      type: String,
      trim: true,
      sparse: true,
    },
    hostingPort: {
      type: Number,
      default: null,
    },
    sshPassword: {
      type: String,
      default: '',
    },
    usedStorageMB: {
      type: Number,
      default: 0,
    },
    assignedServers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Server',
      },
    ],
    limits: {
      ramLimitMB: { type: Number, default: 2048 }, // 2GB RAM limit
      diskLimitMB: { type: Number, default: 20480 }, // 20GB ROM / Disk limit
      cpuLimitPercent: { type: Number, default: 50 }, // 50% CPU allocation
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
