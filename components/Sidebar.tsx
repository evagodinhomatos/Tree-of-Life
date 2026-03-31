"use client";

import { useEffect, useState } from "react";
import type { AnnotatedTreeNode, TaxonMedia } from "@/lib/types";

type SidebarProps = {
  node: AnnotatedTreeNode | null;
  lineage: AnnotatedTreeNode[];
  compareNode: AnnotatedTreeNode | null;
  compareMatches: AnnotatedTreeNode[];
  compareQuery: string;
  commonAncestor: AnnotatedTreeNode | null;
  onCompareClear: () => void;
  onCompareQueryChange: (value: string) => void;
  onCompareSelect: (nodeId: string) => void;
  onClose: () => void;
};

export default function Sidebar({
  node,
  lineage,
  compareNode,
  compareMatches,
  compareQuery,
  commonAncestor,
  onCompareClear,
  onCompareQueryChange,
  onCompareSelect,
  onClose,
}: SidebarProps) {
  const [media, setMedia] = useState<TaxonMedia | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [showFullLineage, setShowFullLineage] = useState(false);

  useEffect(() => {
    if (!node) {
      setMedia(null);
      setIsLoadingMedia(false);
      return;
    }

    const nodeName = node.name;

    let isMounted = true;
    const controller = new AbortController();

    async function loadMedia() {
      setIsLoadingMedia(true);

      try {
        const response = await fetch(
          `/api/taxon-media?name=${encodeURIComponent(nodeName)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load media");
        }

        const payload = (await response.json()) as TaxonMedia;
        if (isMounted) {
          setMedia(payload);
        }
      } catch {
        if (isMounted) {
          setMedia({
            imageUrl: null,
            source: "none",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingMedia(false);
        }
      }
    }

    void loadMedia();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [node]);

  useEffect(() => {
    setShowFullLineage(false);
  }, [node?.id]);

  if (!node) {
    return null;
  }

  const compactLineage = [
    lineage[0],
    ...(lineage.length > 4 ? [{ id: "ellipsis", name: "..." } as const] : []),
    ...lineage.slice(Math.max(1, lineage.length - 3)),
  ].filter((item, index, items) => index === 0 || item.id !== items[index - 1]?.id);

  return (
    <aside className="sidebar-overlay">
      <div className="sidebar-card">
      <button
        aria-label="Close taxon details"
        className="sidebar-close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <div className="sidebar-media">
        {media?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={node.name} className="sidebar-media-image" src={media.imageUrl} />
        ) : (
          <div className="sidebar-media-placeholder">
            <span>{isLoadingMedia ? "Loading image..." : node.name}</span>
          </div>
        )}
        <div className="sidebar-media-overlay">
          <span className="sidebar-media-label">Specimen View</span>
          {media?.source !== "none" ? (
            <span className="sidebar-media-meta">
              {media?.source === "onezoom" ? "OneZoom media" : "Wikipedia media"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="sidebar-topline">
        <p className="sidebar-rank">{node.attributes.rank}</p>
        {node.attributes.period ? (
          <span className="sidebar-badge">{node.attributes.period}</span>
        ) : null}
      </div>
      <div className="sidebar-breadcrumb">
        {compactLineage.map((ancestor, index) => (
          <span className="sidebar-breadcrumb-item" key={ancestor.id}>
            {index > 0 ? <span className="sidebar-breadcrumb-separator">→</span> : null}
            {ancestor.name}
          </span>
        ))}
      </div>
      <h2 className="sidebar-title">{node.name}</h2>

      <p className="sidebar-description">
        {node.attributes.description ??
          "This taxon is part of the local exploratory dataset and can be expanded within the tree to inspect related branches."}
      </p>

      <section className="sidebar-compare-picker">
        <div className="sidebar-lineage-header">
          <h3 className="sidebar-section-title">Compare</h3>
          {compareNode ? (
            <button className="sidebar-lineage-toggle" onClick={onCompareClear} type="button">
              Clear
            </button>
          ) : null}
        </div>
        <label className="sidebar-compare-search">
          <span>Compare with {node.name}</span>
          <input
            type="search"
            placeholder="Try Brachiosaurus, Triceratops, Allosaurus..."
            value={compareQuery}
            onChange={(event) => onCompareQueryChange(event.target.value)}
          />
        </label>
        {compareNode ? (
          <div className="compare-chip">
            <div>
              <strong>{compareNode.name}</strong>
              <small>{compareNode.attributes.rank}</small>
            </div>
            <button onClick={onCompareClear} type="button">
              Clear
            </button>
          </div>
        ) : null}
        {compareQuery.trim().length > 0 ? (
          <div className="search-dropdown sidebar-search-dropdown" aria-live="polite">
            {compareMatches.length > 0 ? (
              compareMatches.map((entry) => (
                <button
                  key={entry.id}
                  className="search-result"
                  onClick={() => onCompareSelect(entry.id)}
                  type="button"
                >
                  <div className="search-result-main">
                    <span>{entry.name}</span>
                    <small>
                      {entry.attributes.rank}
                      {entry.attributes.period ? ` • ${entry.attributes.period}` : ""}
                    </small>
                  </div>
                </button>
              ))
            ) : (
              <p className="search-empty">No matching taxa found.</p>
            )}
          </div>
        ) : null}
      </section>

      <section>
        <div className="sidebar-lineage-header">
          <h3 className="sidebar-section-title">Lineage overview</h3>
          {lineage.length > 1 ? (
            <button
              className="sidebar-lineage-toggle"
              onClick={() => setShowFullLineage((current) => !current)}
              type="button"
            >
              {showFullLineage ? "Hide full lineage" : "Show full lineage"}
            </button>
          ) : null}
        </div>
        {showFullLineage ? (
          <div className="lineage-list">
            {lineage.map((ancestor) => (
              <span className="lineage-pill" key={ancestor.id}>
                {ancestor.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="sidebar-lineage-summary">
            <span>{lineage[0]?.name}</span>
            <span>{lineage[lineage.length - 1]?.name}</span>
            <span>{lineage.length} levels</span>
          </div>
        )}
      </section>

      {compareNode ? (
        <section className="sidebar-compare">
          <h3 className="sidebar-section-title">Comparison</h3>
          <div className="sidebar-lineage-summary">
            <span>{node.name}</span>
            <span>{compareNode.name}</span>
          </div>
          {commonAncestor ? (
            <div className="fact-chip">
              Shared ancestor: {commonAncestor.name}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="fact-grid">
        <h3 className="sidebar-section-title">Taxon details</h3>
        <div className="fact-chip">Rank: {node.attributes.rank}</div>
        {node.attributes.period ? (
          <div className="fact-chip">Geological period: {node.attributes.period}</div>
        ) : null}
        <div className="fact-chip">
          Direct descendants: {node.children?.length ?? 0}
        </div>
        {media?.ottId ? <div className="fact-chip">Open Tree ID: {media.ottId}</div> : null}
        {media?.pageUrl ? (
          <a className="sidebar-source-link" href={media.pageUrl} rel="noreferrer" target="_blank">
            View image source
          </a>
        ) : null}
        {media?.credit ? <div className="sidebar-credit">{media.credit}</div> : null}
      </section>
      </div>
    </aside>
  );
}
