import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ApiRequestLogSchema = new Schema({
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  ipAddress: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

ApiRequestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export type ApiRequestLogDocument = InferSchemaType<typeof ApiRequestLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export type ApiRequestLogLean = Omit<ApiRequestLogDocument, "__v">;

export const ApiRequestLog =
  (mongoose.models.ApiRequestLog as mongoose.Model<ApiRequestLogDocument>) ||
  mongoose.model<ApiRequestLogDocument>("ApiRequestLog", ApiRequestLogSchema);
