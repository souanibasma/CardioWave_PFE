import mongoose, { Document, Schema, Types } from "mongoose";

interface IComment {
  _id?: Types.ObjectId;
  content: string;
  author?: Types.ObjectId;
  createdAt?: Date;
}

export interface IArticle extends Document {
  title: string;
  content: string;
  category: string;
  coverImage?: string;
  author: Types.ObjectId;
  isPublished: boolean;
  likes: Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const articleSchema = new Schema<IArticle>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Éducation", "Prévention", "Pathologie", "Traitement", "Actualité"],
      trim: true,
    },
    coverImage: {
      type: String,
      default: "",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    likes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IArticle>("Article", articleSchema);