import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AppSettingsSchema = new Schema(
  {
    _id: { type: String, required: true, default: "default" },
    apiKey: { type: String, required: true },
    totalRequests: { type: Number, default: 0 },
    rateLimitPerHour: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

export type AppSettingsDocument = InferSchemaType<typeof AppSettingsSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AppSettingsLean = Omit<AppSettingsDocument, "__v">;

export const AppSettings =
  (mongoose.models.AppSettings as mongoose.Model<AppSettingsDocument>) ||
  mongoose.model<AppSettingsDocument>("AppSettings", AppSettingsSchema);
