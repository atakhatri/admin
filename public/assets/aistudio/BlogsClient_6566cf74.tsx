"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3, Search, Tags } from "lucide-react";
import type { BlogPostMeta } from "@/lib/blogs";
import { X } from "lucide-react";

type BlogsClientProps = {
  posts: BlogPostMeta[];
  categories: string[];
};

const POSTS_PER_BATCH = 4;

export default function BlogsClient({ posts, categories }: BlogsClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filterCategories = useMemo(() => ["All", ...categories], [categories]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return posts.filter((post) => {
      const inCategory =
        activeCategory === "All" || post.category === activeCategory;

      if (!inCategory) {
        return false;
      }

      if (!q) {
        return true;
      }

      const searchable = [
        post.title,
        post.excerpt,
        post.category,
        post.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [posts, search, activeCategory]);

  const featuredPost =
    filteredPosts.find((post) => post.featured) ?? filteredPosts[0] ?? null;
  const latestPosts = featuredPost
    ? filteredPosts.filter((post) => post.slug !== featuredPost.slug)
    : [];
  const visiblePosts = latestPosts.slice(0, visibleCount);
  const hasMore = visiblePosts.length < latestPosts.length;

  useEffect(() => {
    setVisibleCount(POSTS_PER_BATCH);
  }, [search, activeCategory]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        setVisibleCount((prev) =>
          Math.min(prev + POSTS_PER_BATCH, latestPosts.length),
        );
      },
      {
        root: null,
        rootMargin: "300px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [latestPosts.length, hasMore]);

  return (
    <>
      <section className="container mx-auto px-4 pt-20 pb-8 md:pt-24">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 md:p-8 backdrop-blur-sm">
            <h1 className="mt-4 text-4xl md:text-6xl font-bold text-amber-400">
              Blogs & Updates
            </h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-white/80">
              A place where I share what I am building, what I am learning, and
              the experiences behind my projects.
            </p>

            <div className="mt-6">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <label className="relative block lg:max-w-xl lg:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-amber-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search blogs by title, tags, or topic..."
                    className="w-full rounded-full border border-white/20 bg-black/25 px-10 py-2.5 pr-28 text-sm text-white placeholder:text-white/45 outline-none transition-all duration-300 focus:border-amber-300/40 focus:bg-black/35"
                  />
                  {search.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full  px-1 py-1 text-xs text-white/85 transition-all duration-300 hover:bg-white/20"
                    >
                      <X className="h-6 w-6 text-amber-400" />
                    </button>
                  )}
                </label>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/15 bg-white/10 p-4 md:p-6 backdrop-blur-sm">
            <h2 className="text-[2rem] font-bold text-amber-300">Categories</h2>
            <p className="mt-1 text-xs text-white/70">Filter blogs by topic.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {filterCategories.map((category) => {
                const active = category === activeCategory;

                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                      active
                        ? "border-amber-300/40 bg-amber-500 text-black"
                        : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      {featuredPost && (
        <section className="container mx-auto px-4 pb-6">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/15 bg-white/10 md:grid-cols-2">
            <div className="relative min-h-[260px] md:min-h-[340px]">
              <Image
                src={featuredPost.cover}
                alt={featuredPost.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex flex-col justify-between p-4 md:p-6">
              <div>
                <p className="mb-3 inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
                  Featured Post
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {featuredPost.title}
                </h2>
                <p className="mt-3 text-sm md:text-base text-white/80">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {featuredPost.publishedAt}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {featuredPost.readTime}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5">
                  <Tags className="h-3.5 w-3.5" />
                  {featuredPost.category}
                </span>
              </div>

              <Link
                href={featuredPost.href}
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-all duration-300 hover:bg-amber-300"
              >
                Read post
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-10 md:pb-14">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-2xl md:text-3xl font-bold text-amber-300">
            Latest Posts
          </h3>
          <p className="text-sm text-white/70">
            {filteredPosts.length - 1} posts
          </p>
        </div>

        {latestPosts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visiblePosts.map((post) => (
              <article
                key={post.slug}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 transition-all duration-300 hover:bg-white/15"
              >
                <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                  {post.category}
                </p>

                <h4 className="text-xl font-bold text-white">{post.title}</h4>
                <p className="mt-2 text-sm text-white/75">{post.excerpt}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {post.publishedAt}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {post.readTime}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={post.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm text-amber-300 transition-colors hover:text-amber-200"
                >
                  Read post
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-5 flex flex-col items-center gap-3">
            <div
              ref={loadMoreRef}
              aria-hidden="true"
              className="h-2 w-full max-w-md"
            />
            <p className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/70">
              Loading more posts...
            </p>
          </div>
        )}

        {filteredPosts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-4 text-sm text-white/75">
            No blogs found for this search and category. Try a different
            keyword.
          </div>
        )}
      </section>
    </>
  );
}
