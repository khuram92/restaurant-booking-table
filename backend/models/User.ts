// models/User.ts
import bcrypt from "bcrypt";
import mongoose, { Document, Model, Schema } from "mongoose";

export type UserRole = "customer" | "restaurant" | "admin";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  dob: Date;
  phone: string;
  password: string;
  favorites: mongoose.Types.ObjectId[];
  address: string;
  role: UserRole;
  avatar: string;
  foodInterests: string[];
  resetOtp?: string;
  resetOtpExpiresAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    foodInterests: { type: [String], default: [] },
    dob: {
      type: Date,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    address: { type: String },
    role: {
      type: String,
      enum: ["customer", "restaurant", "admin"],
      required: true,
      default: "customer",
    },
    avatar: { type: String },
    resetOtp: { type: String },
    resetOtpExpiresAt: { type: Date },

    favorites: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
  },
  { timestamps: true },
);
userSchema.methods.comparePassword = function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
