import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SoundSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    format: { type: String, required: true },
    mimeType: { type: String, default: "video/mp4" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: null },
    status: { type: String, default: "Draft" },
    tags: { type: String, default: null },
    description: { type: String, default: null },
    order: { type: Number, default: 0 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    category: { type: String, default: "" },
  },
  { timestamps: true }
);

SoundSchema.index({ order: 1, createdAt: 1 });
SoundSchema.index({ status: 1, order: 1, createdAt: 1 });
SoundSchema.index({ category: 1 });
SoundSchema.index({ format: 1 });
SoundSchema.index({ createdAt: 1 });

export type SoundDocument = InferSchemaType<typeof SoundSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SoundLean = Omit<SoundDocument, "__v">;

export const Sound =
  (mongoose.models.Sound as mongoose.Model<SoundDocument>) ||
  mongoose.model<SoundDocument>("Sound", SoundSchema);
