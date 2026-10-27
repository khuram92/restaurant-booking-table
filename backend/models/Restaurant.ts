import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRestaurant extends Document {
  owner?: mongoose.Types.ObjectId;
  name: string;
  cuisines?: string;
  city?: string;
  province?: string;
  address?: string;
  phone?: string;
  description?: string;
  images: string[];
  openingTime?: string;
  closingTime?: string;
  rating: number;
  reviewCount: number;
  floorNumbers: string[];
  availableSeats: number;
  seatingTypes: string[];
  isActive: boolean;
  isFeatured: boolean;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    name: { type: String, required: true, trim: true },
    cuisines: { type: String },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    description: { type: String },
    images: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    openingTime: { type: String },
    closingTime: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    floorNumbers: { type: [String], default: [] },
    availableSeats: { type: Number, default: 0, min: 0 },
    seatingTypes: { type: [String], default: [] },
    reviewCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Restaurant: Model<IRestaurant> = mongoose.model<IRestaurant>(
  "Restaurant",
  restaurantSchema,
);

export default Restaurant;
