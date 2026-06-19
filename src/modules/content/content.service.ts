import * as repo from './content.repository';
import { AppError } from '../../utils/AppError';
import sanitizeHtml from 'sanitize-html';
import type { ContentPostType } from '@prisma/client';

// Sanitize settings for rich text
const richTextSanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'h1', 'h2', 'span', 'div', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'blockquote', 'a'
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    'a': ['href', 'name', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
    'span': ['style'],
    'p': ['style'],
    'div': ['style']
  }
};

// Sanitize settings for plain comments (only simple tags allowed)
const commentSanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel']
  }
};

function sanitizeContent(text?: string | null, isComment = false): string | null {
  if (!text) return text ?? null;
  return sanitizeHtml(text, isComment ? commentSanitizeOptions : richTextSanitizeOptions);
}

// ─── Posts ───────────────────────────────────────────────────────

export async function createPost(dto: any, userId: string) {
  // Slug unique check
  const existing = await repo.findPostBySlug(dto.slug, false);
  if (existing) {
    throw AppError.conflict('Slug is already in use');
  }

  const data = {
    ...dto,
    bodyEn: sanitizeContent(dto.bodyEn),
    bodyBn: sanitizeContent(dto.bodyBn),
    summaryEn: sanitizeContent(dto.summaryEn, true),
    summaryBn: sanitizeContent(dto.summaryBn, true),
    createdById: userId,
  };

  return repo.createPost(data);
}

export async function updatePost(id: string, dto: any) {
  const post = await repo.findPostById(id);
  if (!post) throw AppError.notFound('Post');

  if (dto.slug && dto.slug !== post.slug) {
    const existing = await repo.findPostBySlug(dto.slug, false);
    if (existing) {
      throw AppError.conflict('Slug is already in use');
    }
  }

  const data = {
    ...dto,
    bodyEn: dto.bodyEn !== undefined ? sanitizeContent(dto.bodyEn) : undefined,
    bodyBn: dto.bodyBn !== undefined ? sanitizeContent(dto.bodyBn) : undefined,
    summaryEn: dto.summaryEn !== undefined ? sanitizeContent(dto.summaryEn, true) : undefined,
    summaryBn: dto.summaryBn !== undefined ? sanitizeContent(dto.summaryBn, true) : undefined,
  };

  return repo.updatePost(id, data);
}

export async function deletePost(id: string) {
  const post = await repo.findPostById(id);
  if (!post) throw AppError.notFound('Post');
  await repo.deletePost(id);
  return { success: true };
}

export async function getPostById(id: string) {
  const post = await repo.findPostById(id);
  if (!post) throw AppError.notFound('Post');
  return post;
}

export async function getPostBySlug(slug: string, publicOnly = true, userId?: string) {
  const post = await repo.findPostBySlug(slug, publicOnly);
  if (!post) throw AppError.notFound('Post');

  // Increment views asynchronously
  repo.incrementPostViews(post.id).catch(() => null);

  const liked = userId ? await repo.checkUserLiked(post.id, userId) : false;

  return {
    ...post,
    liked,
  };
}

export async function listPosts(filters: any) {
  return repo.listPosts(filters);
}

export async function getHomepageContent() {
  // Pinned/Featured sorted public content
  // Return recent videos and recent community posts separately
  const videosPromise = repo.listPosts({
    type: 'VIDEO' as ContentPostType,
    status: 'published',
    showOnHomepage: true,
    limit: 10,
  });

  const postsPromise = repo.listPosts({
    status: 'published',
    showOnHomepage: true,
    limit: 10,
  });

  const [videosResult, postsResult] = await Promise.all([videosPromise, postsPromise]);

  // For posts, filter out VIDEO so we show only community update types
  const communityPosts = postsResult.items.filter(item => item.type !== 'VIDEO');

  return {
    featuredVideos: videosResult.items,
    communityPosts: communityPosts,
  };
}

// ─── Categories ──────────────────────────────────────────────────

export async function createCategory(dto: any) {
  const existing = await repo.findCategoryBySlug(dto.slug);
  if (existing) throw AppError.conflict('Category slug is already in use');
  return repo.createCategory(dto);
}

export async function updateCategory(id: string, dto: any) {
  const cat = await repo.findCategoryById(id);
  if (!cat) throw AppError.notFound('Category');

  if (dto.slug && dto.slug !== cat.slug) {
    const existing = await repo.findCategoryBySlug(dto.slug);
    if (existing) throw AppError.conflict('Category slug is already in use');
  }

  return repo.updateCategory(id, dto);
}

export async function deleteCategory(id: string) {
  const cat = await repo.findCategoryById(id);
  if (!cat) throw AppError.notFound('Category');
  await repo.deleteCategory(id);
  return { success: true };
}

export async function getCategoryById(id: string) {
  const cat = await repo.findCategoryById(id);
  if (!cat) throw AppError.notFound('Category');
  return cat;
}

export async function listCategories() {
  return repo.listCategories();
}

// ─── Comments ────────────────────────────────────────────────────

export async function addComment(postId: string, userId: string, body: string) {
  const post = await repo.findPostById(postId);
  if (!post) throw AppError.notFound('Post');
  if (!post.allowComments || post.status !== 'published') {
    throw AppError.badRequest('Comments are disabled for this post');
  }

  const sanitized = sanitizeContent(body, true);
  if (!sanitized) throw AppError.badRequest('Comment body cannot be empty');

  return repo.createComment({
    postId,
    userId,
    body: sanitized,
    status: 'approved', // Auto-approved, but editable/moderatable
  });
}

export async function editComment(commentId: string, userId: string, body: string, isOp = false) {
  const comment = await repo.findCommentById(commentId);
  if (!comment) throw AppError.notFound('Comment');
  
  if (comment.userId !== userId && !isOp) {
    throw AppError.forbidden('You are not authorized to edit this comment');
  }

  const sanitized = sanitizeContent(body, true);
  if (!sanitized) throw AppError.badRequest('Comment body cannot be empty');

  return repo.updateComment(commentId, sanitized);
}

export async function deleteComment(commentId: string, userId: string, isAdmin = false) {
  const comment = await repo.findCommentById(commentId);
  if (!comment) throw AppError.notFound('Comment');

  if (comment.userId !== userId && !isAdmin) {
    throw AppError.forbidden('You are not authorized to delete this comment');
  }

  await repo.deleteComment(commentId);
  return { success: true };
}

export async function listComments(filters: any) {
  return repo.listComments(filters);
}

export async function moderateComment(commentId: string, status: string) {
  const comment = await repo.findCommentById(commentId);
  if (!comment) throw AppError.notFound('Comment');
  return repo.updateCommentStatus(commentId, status);
}

// ─── Reactions ───────────────────────────────────────────────────

export async function toggleLikePost(postId: string, userId: string, like: boolean) {
  const post = await repo.findPostById(postId);
  if (!post) throw AppError.notFound('Post');

  if (like) {
    await repo.upsertReaction(postId, userId, 'like');
  } else {
    await repo.removeReaction(postId, userId);
  }

  const updatedPost = await repo.findPostById(postId);
  return {
    postId,
    likeCount: updatedPost?.likeCount ?? 0,
    liked: like
  };
}

// ─── Reports ─────────────────────────────────────────────────────

export async function reportContent(reportedById: string, dto: { postId?: string; commentId?: string; reason: string }) {
  if (!dto.postId && !dto.commentId) {
    throw AppError.badRequest('Either postId or commentId must be reported');
  }

  if (dto.postId) {
    const post = await repo.findPostById(dto.postId);
    if (!post) throw AppError.notFound('Post');
  }

  if (dto.commentId) {
    const comment = await repo.findCommentById(dto.commentId);
    if (!comment) throw AppError.notFound('Comment');
  }

  return repo.createReport({
    postId: dto.postId,
    commentId: dto.commentId,
    reportedById,
    reason: dto.reason,
  });
}

export async function listReports(filters: any) {
  return repo.listReports(filters);
}

export async function updateReportStatus(id: string, status: string) {
  return repo.updateReportStatus(id, status);
}
