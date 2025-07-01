import { Router, Request, Response } from "express";
import { Post } from "../models/post";
import { validate, postValidation, ValidationError } from "../utils/validation";
import { logger } from "../utils/logger";

const router = Router();

// Get all posts
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isPublished: true })
      .populate("author", "firstName lastName email")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ isPublished: true });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Failed to fetch posts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
    });
  }
});

// Get single post
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "firstName lastName email")
      .populate("comments.author", "firstName lastName");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Increment view count
    await post.incrementViews();

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    logger.error("Failed to fetch post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch post",
    });
  }
});

// Create post
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = validate(postValidation.create, req.body);

    // In a real app, you'd get the user ID from JWT token
    const authorId = req.body.authorId || "507f1f77bcf86cd799439011";

    const post = new Post({
      ...validatedData,
      author: authorId,
    });

    await post.save();
    await post.populate("author", "firstName lastName email");

    logger.info(`Post created: ${post.title}`);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    logger.error("Failed to create post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create post",
    });
  }
});

// Update post
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const validatedData = validate(postValidation.update, req.body);

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    Object.assign(post, validatedData);
    await post.save();
    await post.populate("author", "firstName lastName email");

    logger.info(`Post updated: ${post.title}`);

    res.json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    logger.error("Failed to update post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update post",
    });
  }
});

// Delete post
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    logger.info(`Post deleted: ${post.title}`);

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete post",
    });
  }
});

// Add comment to post
router.post("/:id/comments", async (req: Request, res: Response) => {
  try {
    const validatedData = validate(postValidation.comment, req.body);

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // In a real app, you'd get the user ID from JWT token
    const authorId = req.body.authorId || "507f1f77bcf86cd799439011";

    await post.addComment(authorId, validatedData.content);
    await post.populate("comments.author", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: post,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    logger.error("Failed to add comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
});

export default router;
