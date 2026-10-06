import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "https://travelguidesuhani-production.up.railway.app";

// ── Star Rating input ──────────────────────────────────────────────────────────
const StarRating = ({ value, onChange }) => (
  <div className="d-flex gap-1 mb-3" style={{ fontSize: 28, cursor: "pointer" }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        onClick={() => onChange(star)}
        style={{ color: star <= value ? "#FFD700" : "#555", transition: "color 0.15s" }}
        role="button"
        aria-label={`${star} star`}
      >
        ★
      </span>
    ))}
  </div>
);

// ── Single review card ─────────────────────────────────────────────────────────
const ReviewCard = ({ review }) => {
  const date = new Date(review.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="p-3 mb-3 rounded"
      style={{ backgroundColor: "#2B3770", border: "1px solid #3d4f8c" }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <strong className="text-white">{review.author}</strong>
        <span style={{ color: "#aaa", fontSize: 13 }}>{date}</span>
      </div>

      {/* Stars display */}
      <div style={{ color: "#FFD700", fontSize: 18, marginBottom: 8 }}>
        {"★".repeat(review.rating)}
        <span style={{ color: "#555" }}>{"★".repeat(5 - review.rating)}</span>
      </div>

      <p className="text-white mb-2" style={{ lineHeight: 1.6 }}>
        {review.comment}
      </p>

      {review.photo_url && (
        <img
          src={`${API_BASE}${review.photo_url}`}
          alt="Review"
          className="rounded mt-1"
          style={{ maxWidth: "100%", maxHeight: 260, objectFit: "cover" }}
        />
      )}
    </motion.div>
  );
};

// ── Main ReviewSection ─────────────────────────────────────────────────────────
const ReviewSection = ({ placeName }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  // ── Fetch reviews ────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/reviews?place=${encodeURIComponent(placeName)}`
      );
      if (!res.ok) throw new Error("Failed to load reviews.");
      setReviews(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [placeName]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ── Photo picker ─────────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg("");

    if (!author.trim() || !comment.trim()) {
      setSubmitMsg("Please fill in your name and comment.");
      return;
    }

    const formData = new FormData();
    formData.append("place", placeName);
    formData.append("author", author.trim());
    formData.append("rating", rating);
    formData.append("comment", comment.trim());
    if (photo) formData.append("photo", photo);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed.");
      }
      // Reset form
      setAuthor("");
      setRating(5);
      setComment("");
      clearPhoto();
      setSubmitMsg("✓ Review posted! Thank you.");
      fetchReviews();
    } catch (e) {
      setSubmitMsg(`Error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section
      style={{
        backgroundColor: "#1a2240",
        padding: "60px 0",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px" }}>
        <h2 className="text-white mb-1" style={{ fontSize: 32 }}>
          Reviews
        </h2>
        <p style={{ color: "#aaa", marginBottom: 40 }}>
          Share your experience at {placeName}
        </p>

        {/* ── Submit form ─────────────────────────────────────────────────── */}
        <div
          className="p-4 rounded mb-5"
          style={{ backgroundColor: "#243060", border: "1px solid #3d4f8c" }}
        >
          <h5 className="text-white mb-3">Write a Review</h5>
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-3">
              <label className="form-label text-white" htmlFor="rv-author">
                Your Name
              </label>
              <input
                id="rv-author"
                type="text"
                className="form-control"
                placeholder="e.g. Jane Doe"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                style={{
                  backgroundColor: "#1a2240",
                  color: "#fff",
                  border: "1px solid #3d4f8c",
                }}
                maxLength={80}
                required
              />
            </div>

            {/* Rating */}
            <div className="mb-2">
              <label className="form-label text-white d-block">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {/* Comment */}
            <div className="mb-3">
              <label className="form-label text-white" htmlFor="rv-comment">
                Comment
              </label>
              <textarea
                id="rv-comment"
                className="form-control"
                rows={4}
                placeholder="Tell us about your visit…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  backgroundColor: "#1a2240",
                  color: "#fff",
                  border: "1px solid #3d4f8c",
                  resize: "vertical",
                }}
                maxLength={1000}
                required
              />
            </div>

            {/* Photo */}
            <div className="mb-3">
              <label className="form-label text-white" htmlFor="rv-photo">
                Photo{" "}
                <span style={{ color: "#aaa", fontSize: 13 }}>
                  (optional · JPEG/PNG/WebP/GIF · max 5 MB)
                </span>
              </label>
              <input
                id="rv-photo"
                type="file"
                className="form-control"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoChange}
                style={{
                  backgroundColor: "#1a2240",
                  color: "#fff",
                  border: "1px solid #3d4f8c",
                }}
              />
              {photoPreview && (
                <div className="mt-2 position-relative d-inline-block">
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="rounded"
                    style={{ maxHeight: 140, maxWidth: "100%", objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="btn btn-sm position-absolute top-0 end-0"
                    style={{
                      backgroundColor: "#FF3D00",
                      color: "#fff",
                      lineHeight: 1,
                      padding: "2px 7px",
                    }}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Submit feedback */}
            {submitMsg && (
              <p
                style={{
                  color: submitMsg.startsWith("✓") ? "#4caf50" : "#f44336",
                  marginBottom: 12,
                  fontSize: 14,
                }}
              >
                {submitMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn"
              style={{
                backgroundColor: "#FF3D00",
                color: "#fff",
                padding: "8px 28px",
                borderRadius: 7,
                fontWeight: 600,
              }}
            >
              {submitting ? "Posting…" : "Post Review"}
            </button>
          </form>
        </div>

        {/* ── Reviews list ────────────────────────────────────────────────── */}
        <h5 className="text-white mb-3">
          {reviews.length > 0
            ? `${reviews.length} Review${reviews.length > 1 ? "s" : ""}`
            : "No reviews yet — be the first!"}
        </h5>

        {loading && <p style={{ color: "#aaa" }}>Loading reviews…</p>}
        {error && <p style={{ color: "#f44336" }}>{error}</p>}

        <AnimatePresence>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ReviewSection;
