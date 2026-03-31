"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TreeView from "@/components/TreeView";
import rawTreeData from "@/data/tree-of-life.json";
import {
  annotateTree,
  collectMatches,
  findNodeById,
  findPathToRoot,
} from "@/lib/tree-utils";
import type { TreeNodeDatum } from "@/lib/types";

type FocusMode = "full" | "lineage" | "relatives";

const treeData = annotateTree(rawTreeData as TreeNodeDatum);

function countNodes(node: TreeNodeDatum): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0);
}

function countLeaves(node: TreeNodeDatum): number {
  if (!node.children?.length) {
    return 1;
  }

  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function collectRanks(node: TreeNodeDatum, ranks = new Set<string>()) {
  ranks.add(node.attributes.rank);
  node.children?.forEach((child) => collectRanks(child, ranks));
  return ranks;
}

const totalNodes = countNodes(treeData);
const totalLeaves = countLeaves(treeData);
const totalRanks = collectRanks(treeData).size;

function buildMatchContext(node: TreeNodeDatum & { id: string }, root: typeof treeData) {
  const lineage = findPathToRoot(root, node.id);
  const parent = lineage[lineage.length - 2];

  return {
    parent,
    subtitle: `${node.attributes.rank}${
      node.attributes.period ? ` • ${node.attributes.period}` : ""
    }`,
    meta: `${node.attributes.rank.charAt(0).toUpperCase() + node.attributes.rank.slice(1)}${
      parent ? ` • Within ${parent.name} (${parent.attributes.rank})` : ""
    }`,
  };
}

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [compareQuery, setCompareQuery] = useState("");
  const [focusMode, setFocusMode] = useState<FocusMode>("full");
  const isExploring = Boolean(selectedId || query.trim());

  const selectedNode = useMemo(
    () => (selectedId ? findNodeById(treeData, selectedId) : null),
    [selectedId],
  );

  const lineageIds = useMemo(
    () =>
      new Set(
        selectedId ? findPathToRoot(treeData, selectedId).map((node) => node.id) : [],
      ),
    [selectedId],
  );

  const compareNode = useMemo(
    () => (compareId ? findNodeById(treeData, compareId) : null),
    [compareId],
  );

  const compareLineage = useMemo(
    () => (compareId ? findPathToRoot(treeData, compareId) : []),
    [compareId],
  );

  const compareLineageIds = useMemo(
    () => new Set(compareLineage.map((node) => node.id)),
    [compareLineage],
  );

  const matches = useMemo(
    () => collectMatches(treeData, query).slice(0, 8),
    [query],
  );

  const compareMatches = useMemo(
    () =>
      collectMatches(treeData, compareQuery)
        .filter((node) => node.id !== selectedId)
        .slice(0, 8),
    [compareQuery, selectedId],
  );

  const commonAncestor = useMemo(() => {
    if (!selectedNode || !compareNode) {
      return null;
    }

    const limit = Math.min(
      findPathToRoot(treeData, selectedNode.id).length,
      compareLineage.length,
    );
    const selectedLineage = findPathToRoot(treeData, selectedNode.id);
    let ancestor = null;

    for (let index = 0; index < limit; index += 1) {
      if (selectedLineage[index]?.id === compareLineage[index]?.id) {
        ancestor = selectedLineage[index];
      } else {
        break;
      }
    }

    return ancestor;
  }, [compareLineage, compareNode, selectedNode]);

  useEffect(() => {
    if (selectedId && !findNodeById(treeData, selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId]);

  useEffect(() => {
    if (compareId && !findNodeById(treeData, compareId)) {
      setCompareId(null);
    }
  }, [compareId]);

  useEffect(() => {
    if (!selectedId) {
      setCompareId(null);
      setCompareQuery("");
    }
  }, [selectedId]);

  return (
    <main className="page-shell">
      <section className={isExploring ? "explorer-panel explorer-panel-compact" : "explorer-panel"}>
        <div className="hero">
          <div>
            <p className="eyebrow">Phylogenetic Atlas</p>
            <div className="hero-title-row">
              <h1>Tree of Life Explorer</h1>
            </div>
            <div className="hero-primary">
              <p className="hero-copy">
                Navigate major evolutionary branches, inspect taxonomic ranks, and
                trace each organism&apos;s lineage back to the root.
              </p>
              <div className="hero-stats">
                <div className="hero-stat">
                  <strong>{totalNodes}</strong>
                  <span>taxa and intermediate nodes</span>
                </div>
                <div className="hero-stat">
                  <strong>{totalLeaves}</strong>
                  <span>terminal taxa across major lineages</span>
                </div>
                <div className="hero-stat">
                  <strong>{totalRanks}</strong>
                  <span>rank categories represented</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-side">
            <label className="search-panel">
              <span>Search taxa</span>
              <input
                type="search"
                placeholder="Try Tyrannosaurus, Ceratopsia, Archosauria..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.trim().length > 0 && (
                <div className="search-dropdown" aria-live="polite">
                  {matches.length > 0 ? (
                    matches.map((node) => {
                      const context = buildMatchContext(node, treeData);

                      return (
                        <button
                          key={node.id}
                          className="search-result"
                          onClick={() => {
                            setSelectedId(node.id);
                            setSearchTargetId(node.id);
                            setQuery("");
                          }}
                          type="button"
                        >
                          <div className="search-result-main">
                            <span>{node.name}</span>
                            <small>{context.subtitle}</small>
                          </div>
                          <div className="search-result-meta">
                            <span>{context.meta}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="search-empty">No matching taxa found.</p>
                  )}
                </div>
              )}
            </label>
            <div className="hero-note">
              <p className="hero-note-label">Explorer mode</p>
              <p className="hero-note-copy">
                Follow branches, open clades, and inspect lineage like a living
                scientific map.
              </p>
            </div>
          </div>
        </div>

        <div className="explorer-grid">
          <TreeView
            data={treeData}
            lineageIds={lineageIds}
            onNodeSelect={(nodeId) => {
              setSelectedId(nodeId);
              if (compareId === nodeId) {
                setCompareId(null);
              }
              setSearchTargetId(null);
            }}
            searchTargetId={searchTargetId}
            selectedId={selectedId}
            compareId={compareId}
            compareLineageIds={compareLineageIds}
            focusMode={focusMode}
            onFocusModeChange={setFocusMode}
          />
        </div>
        <Sidebar
          compareNode={compareNode}
          compareMatches={compareMatches}
          compareQuery={compareQuery}
          commonAncestor={commonAncestor}
          lineage={selectedId ? findPathToRoot(treeData, selectedId) : []}
          node={selectedNode}
          onCompareClear={() => {
            setCompareId(null);
            setCompareQuery("");
          }}
          onCompareQueryChange={setCompareQuery}
          onCompareSelect={(nodeId) => {
            setCompareId(nodeId);
            setCompareQuery("");
          }}
          onClose={() => {
            setSelectedId(null);
            setCompareId(null);
            setSearchTargetId(null);
          }}
        />
      </section>
    </main>
  );
}
