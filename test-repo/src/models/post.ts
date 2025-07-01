import { Schema, model, Document } from "mongoose";

export interface IPost extends Document {
  title: string;
  content: string;
  author: Schema.Types.ObjectId;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  views: number;
  likes: number;
  comments: Array<{
    author: Schema.Types.ObjectId;
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
postSchema.index({ author: 1 });
postSchema.index({ isPublished: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ title: "text", content: "text" });

// Virtual for comment count
postSchema.virtual("commentCount").get(function (this: IPost) {
  return this.comments.length;
});

// Pre-save middleware
postSchema.pre("save", function (this: IPost) {
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// Methods
postSchema.methods.addComment = function (
  this: IPost,
  authorId: string,
  content: string
) {
  this.comments.push({
    author: authorId as any,
    content,
    createdAt: new Date(),
  });
  return this.save();
};

postSchema.methods.incrementViews = function (this: IPost) {
  this.views += 1;
  return this.save();
};

export const Post = model<IPost>("Post", postSchema);
